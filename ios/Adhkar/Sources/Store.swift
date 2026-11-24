import Foundation

/// Native-side language helper matching Android `L.java`.
enum L {
    private static let lock = NSLock()
    private static var _ar = false

    static var ar: Bool {
        get { lock.withLock { _ar } }
        set { lock.withLock { _ar = newValue } }
    }

    static func t(_ en: String, _ arabic: String) -> String {
        ar ? arabic : en
    }

    static func n(_ s: String) -> String {
        guard ar else { return s }
        var out = String()
        out.reserveCapacity(s.count)
        let zeroScalar: UInt32 = 0x0660 // Eastern Arabic digit ٠
        for scalar in s.unicodeScalars {
            if scalar.value >= 48 && scalar.value <= 57,
               let mapped = UnicodeScalar(zeroScalar + (scalar.value - 48)) {
                out.unicodeScalars.append(mapped)
            } else {
                out.unicodeScalars.append(scalar)
            }
        }
        return out
    }

    static func n(_ v: Int) -> String {
        n(String(v))
    }

    static func prayer(_ k: String) -> String {
        switch k {
        case "fajr": return t("Fajr", "الفجر")
        case "sunrise": return t("Sunrise", "الشروق")
        case "dhuhr": return t("Dhuhr", "الظهر")
        case "asr": return t("ʿAṣr", "العصر")
        case "maghrib": return t("Maghrib", "المغرب")
        default: return t("ʿIshāʾ", "العشاء")
        }
    }
}

/// Native-side durable storage: state.json mirror, synced config, notification action queues, and Umm al-Qura Hijri helpers.
final class Store {
    static let shared = Store()

    private let defaults: UserDefaults
    private let appSupportDir: URL
    private let stateQueue = DispatchQueue(label: "com.adhkar.app.state", qos: .utility)
    private let eventLock = NSLock()
    private var lastSaveSeq: UInt64 = 0

    private enum Keys {
        static let config = "adhkar.config"
        static let nextReminderAt = "adhkar.nextReminderAt"
        static let widgetEvents = "adhkar.wEvents"
        static let trackerEvents = "adhkar.tEvents"
    }

    init(defaults: UserDefaults = .standard, baseDir: URL? = nil) {
        self.defaults = defaults
        if let dir = baseDir {
            self.appSupportDir = dir
        } else {
            let root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
                ?? FileManager.default.temporaryDirectory
            self.appSupportDir = root.appendingPathComponent("Adhkar", isDirectory: true)
        }
        try? FileManager.default.createDirectory(at: appSupportDir, withIntermediateDirectories: true)
    }

    var stateURL: URL {
        appSupportDir.appendingPathComponent("state.json", isDirectory: false)
    }

    var audioDir: URL {
        let dir = appSupportDir.appendingPathComponent("audio", isDirectory: true)
        if !FileManager.default.fileExists(atPath: dir.path) {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var mutable = dir
            try? mutable.setResourceValues(values)
        }
        return dir
    }

    // MARK: - Durable state mirror

    func saveState(_ json: String, seq: UInt64 = 0, synchronous: Bool = false) {
        guard json.utf8.count <= 8_000_000 else { return }
        let work = { [weak self] in
            guard let self = self else { return }
            if seq > 0 && seq < self.lastSaveSeq { return }
            if seq > 0 { self.lastSaveSeq = seq }
            let dst = self.stateURL
            let tmp = dst.appendingPathExtension("tmp")
            do {
                try FileManager.default.createDirectory(at: self.appSupportDir, withIntermediateDirectories: true)
                let data = Data(json.utf8)
                try data.write(to: tmp, options: .atomic)
                if FileManager.default.fileExists(atPath: dst.path) {
                    _ = try FileManager.default.replaceItemAt(dst, withItemAt: tmp)
                } else {
                    try FileManager.default.moveItem(at: tmp, to: dst)
                }
            } catch {
                try? FileManager.default.removeItem(at: tmp)
            }
        }
        if synchronous {
            stateQueue.sync(execute: work)
        } else {
            stateQueue.async(execute: work)
        }
    }

    func loadState() -> String? {
        stateQueue.sync {
            guard let data = try? Data(contentsOf: stateURL),
                  let str = String(data: data, encoding: .utf8) else {
                return nil
            }
            return str
        }
    }

    // MARK: - Synced config

    func saveConfig(_ json: String) {
        defaults.set(json, forKey: Keys.config)
        _ = config() // refresh L.ar
    }

    func config() -> [String: Any] {
        guard let raw = defaults.string(forKey: Keys.config),
              let data = raw.data(using: .utf8),
              let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            L.ar = false
            return [:]
        }
        L.ar = (obj["lang"] as? String) == "ar"
        return obj
    }

    var nextReminderAt: Int64 {
        get { Int64(defaults.double(forKey: Keys.nextReminderAt)) }
        set { defaults.set(Double(newValue), forKey: Keys.nextReminderAt) }
    }

    // MARK: - Prayer options & formatting

    static func opts(from cfg: [String: Any]) -> PrayerCalc.Opts? {
        guard let loc = cfg["loc"] as? [String: Any],
              let lat = number(loc["lat"]),
              let lng = number(loc["lng"]) else {
            return nil
        }
        var o = PrayerCalc.Opts()
        o.lat = lat
        o.lng = lng
        o.tz = (loc["tz"] as? String) ?? ""
        if let calc = cfg["calc"] as? [String: Any] {
            o.method = (calc["method"] as? String) ?? "mwl"
            o.asr = (calc["asr"] as? String) ?? "std"
            o.highLat = (calc["highLat"] as? String) ?? "angle"
            if let a = calc["adj"] as? [String: Any] {
                for (i, key) in PrayerCalc.order.enumerated() {
                    o.adj[i] = intVal(a[key], default: 0)
                }
            }
        }
        if let off = cfg["offsets"] as? [String: Any] {
            o.ds = intVal(off["ds"], default: 20)
            o.de = intVal(off["de"], default: 15)
        }
        return o
    }

    static func locName(from cfg: [String: Any]) -> String {
        (cfg["loc"] as? [String: Any])?["name"] as? String ?? ""
    }

    static func fmtTime(cfg: [String: Any], opts: PrayerCalc.Opts, ms: Int64) -> String {
        let h24 = boolVal(cfg["h24"], default: false)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = PrayerCalc.zone(opts)
        formatter.dateFormat = h24 ? "HH:mm" : "h:mm a"
        let s = formatter.string(from: Date(timeIntervalSince1970: Double(ms) / 1000.0))
        if L.ar {
            let localized = h24 ? s : s.replacingOccurrences(of: " AM", with: " ص").replacingOccurrences(of: " PM", with: " م")
            return L.n(localized)
        }
        return h24 ? s : s.replacingOccurrences(of: "AM", with: "am").replacingOccurrences(of: "PM", with: "pm")
    }

    // MARK: - Hijri (Umm al-Qura)

    static func hijriComponents(cfg: [String: Any], y: Int, m: Int, d: Int) -> (year: Int, month: Int, day: Int) {
        var greg = Calendar(identifier: .gregorian)
        greg.timeZone = TimeZone(secondsFromGMT: 0)!
        guard let noon = greg.date(from: DateComponents(year: y, month: m, day: d, hour: 12, minute: 0, second: 0)),
              let shifted = greg.date(byAdding: .day, value: intVal(cfg["hijriAdj"], default: 0), to: noon) else {
            return (0, 0, 0)
        }
        var islamic = Calendar(identifier: .islamicUmmAlQura)
        islamic.timeZone = TimeZone(secondsFromGMT: 0)!
        let comps = islamic.dateComponents([.year, .month, .day], from: shifted)
        return (comps.year ?? 0, comps.month ?? 0, comps.day ?? 0)
    }

    static func hijriMonth(cfg: [String: Any], y: Int, m: Int, d: Int) -> Int {
        hijriComponents(cfg: cfg, y: y, m: m, d: d).month
    }

    static func noFastDay(cfg: [String: Any], y: Int, m: Int, d: Int) -> Bool {
        let h = hijriComponents(cfg: cfg, y: y, m: m, d: d)
        return (h.month == 10 && h.day == 1) || (h.month == 12 && h.day >= 10 && h.day <= 13)
    }

    // MARK: - Notification & widget event queues

    func recordPrayed(day: String, prayer: String, on: Bool = true) {
        eventLock.withLock {
            var arr = decodeArray(defaults.string(forKey: Keys.widgetEvents))
            arr.append(["d": day, "p": prayer, "on": on])
            if let encoded = encodeJSON(arr) {
                defaults.set(encoded, forKey: Keys.widgetEvents)
            }
        }
    }

    func takeWidgetEvents() -> String {
        eventLock.withLock {
            let raw = defaults.string(forKey: Keys.widgetEvents) ?? "[]"
            defaults.set("[]", forKey: Keys.widgetEvents)
            return raw
        }
    }

    func takeTrackerEvents() -> String {
        eventLock.withLock {
            let raw = defaults.string(forKey: Keys.trackerEvents) ?? "[]"
            defaults.set("[]", forKey: Keys.trackerEvents)
            return raw
        }
    }

    // MARK: - JSON parsing helpers

    static func boolVal(_ v: Any?, default def: Bool) -> Bool {
        if let b = v as? Bool { return b }
        if let n = v as? NSNumber { return n.boolValue }
        return def
    }

    static func intVal(_ v: Any?, default def: Int) -> Int {
        if let i = v as? Int { return i }
        if let n = v as? NSNumber { return n.intValue }
        if let s = v as? String, let i = Int(s) { return i }
        return def
    }

    static func number(_ v: Any?) -> Double? {
        if let d = v as? Double { return d }
        if let n = v as? NSNumber { return n.doubleValue }
        if let s = v as? String { return Double(s) }
        return nil
    }

    private func decodeArray(_ raw: String?) -> [[String: Any]] {
        guard let raw = raw,
              let data = raw.data(using: .utf8),
              let arr = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] else {
            return []
        }
        return arr
    }

    private func encodeJSON(_ obj: Any) -> String? {
        guard let data = try? JSONSerialization.data(withJSONObject: obj) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
