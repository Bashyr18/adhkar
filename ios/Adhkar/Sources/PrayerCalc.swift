import Foundation

/// Swift mirror of `web/js/prayer.js` and `android/.../PrayerCalc.java`. Keep in sync.
enum PrayerCalc {
    static let order = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]
    static let prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"]

    struct Method {
        let fajr: Double
        let isha: Double
        let ishaMin: Double
        let maghribDeg: Double
        let adj: [Int]? // [sunrise, dhuhr, asr, maghrib]
    }

    struct Opts {
        var lat: Double = 0
        var lng: Double = 0
        var method: String = "mwl"
        var asr: String = "std"
        var highLat: String = "angle"
        var adj: [Int] = [0, 0, 0, 0, 0, 0]
        var ds: Int = 20
        var de: Int = 15
        var tz: String = ""
    }

    struct Day {
        var fajr: Int64 = 0
        var sunrise: Int64 = 0
        var dhuhr: Int64 = 0
        var asr: Int64 = 0
        var maghrib: Int64 = 0
        var isha: Int64 = 0
        var nextFajr: Int64 = 0
        var midnight: Int64 = 0
        var lastThird: Int64 = 0
        var duhaStart: Int64 = 0
        var duhaEnd: Int64 = 0
        var y: Int = 0
        var m: Int = 0
        var d: Int = 0

        func get(_ k: String) -> Int64 {
            switch k {
            case "fajr": return fajr
            case "sunrise": return sunrise
            case "dhuhr": return dhuhr
            case "asr": return asr
            case "maghrib": return maghrib
            default: return isha
            }
        }
    }

    static func method(_ id: String?) -> Method {
        switch id ?? "mwl" {
        case "isna": return Method(fajr: 15, isha: 15, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "egypt": return Method(fajr: 19.5, isha: 17.5, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "makkah": return Method(fajr: 18.5, isha: 0, ishaMin: 90, maghribDeg: 0, adj: nil)
        case "karachi": return Method(fajr: 18, isha: 18, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "dubai": return Method(fajr: 18.2, isha: 18.2, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "qatar": return Method(fajr: 18, isha: 0, ishaMin: 90, maghribDeg: 0, adj: nil)
        case "kuwait": return Method(fajr: 18, isha: 17.5, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "singapore", "jakim", "kemenag": return Method(fajr: 20, isha: 18, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "turkey": return Method(fajr: 18, isha: 17, ishaMin: 0, maghribDeg: 0, adj: [-7, 5, 4, 7])
        case "france": return Method(fajr: 12, isha: 12, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "russia": return Method(fajr: 16, isha: 15, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "morocco": return Method(fajr: 19, isha: 17, ishaMin: 0, maghribDeg: 0, adj: [0, 0, 0, 5])
        case "algeria": return Method(fajr: 18, isha: 17, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "tunisia": return Method(fajr: 18, isha: 18, ishaMin: 0, maghribDeg: 0, adj: nil)
        case "jordan": return Method(fajr: 18, isha: 18, ishaMin: 0, maghribDeg: 0, adj: [0, 0, 0, 5])
        default: return Method(fajr: 18, isha: 17, ishaMin: 0, maghribDeg: 0, adj: nil)
        }
    }

    private static func rad(_ d: Double) -> Double { d * .pi / 180.0 }
    private static func deg(_ r: Double) -> Double { r * 180.0 / .pi }
    private static func dsin(_ d: Double) -> Double { Foundation.sin(rad(d)) }
    private static func dcos(_ d: Double) -> Double { Foundation.cos(rad(d)) }
    private static func dtan(_ d: Double) -> Double { Foundation.tan(rad(d)) }

    private static func fix(_ a: Double, _ b: Double) -> Double {
        let v = a - b * Foundation.floor(a / b)
        return v < 0 ? v + b : v
    }

    private static func julian(y: Int, m: Int, d: Int) -> Double {
        var yy = y
        var mm = m
        if mm <= 2 {
            yy -= 1
            mm += 12
        }
        let a = Foundation.floor(Double(yy) / 100.0)
        let b = 2.0 - a + Foundation.floor(a / 4.0)
        return Foundation.floor(365.25 * Double(yy + 4716))
            + Foundation.floor(30.6001 * Double(mm + 1))
            + Double(d) + b - 1524.5
    }

    private static func sunPos(_ jd: Double) -> (decl: Double, eqt: Double) {
        let d = jd - 2451545.0
        let g = fix(357.529 + 0.98560028 * d, 360.0)
        let q = fix(280.459 + 0.98564736 * d, 360.0)
        let l = fix(q + 1.915 * dsin(g) + 0.020 * dsin(2.0 * g), 360.0)
        let e = 23.439 - 0.00000036 * d
        let ra = deg(Foundation.atan2(dcos(e) * dsin(l), dcos(l))) / 15.0
        return (deg(Foundation.asin(dsin(e) * dsin(l))), q / 15.0 - fix(ra, 24.0))
    }

    private static func portion(_ rule: String, _ angle: Double) -> Double {
        if rule == "mid" { return 0.5 }
        if rule == "seventh" { return 1.0 / 7.0 }
        return angle / 60.0
    }

    private static func midDay(_ jd: Double, _ t: Double) -> Double {
        fix(12.0 - sunPos(jd + t).eqt, 24.0)
    }

    private static func angleTime(_ jd: Double, _ lat: Double, _ angle: Double, _ t: Double, _ ccw: Bool) -> Double {
        let dec = sunPos(jd + t).decl
        let noon = midDay(jd, t)
        let c = (-dsin(angle) - dsin(dec) * dsin(lat)) / (dcos(dec) * dcos(lat))
        if c > 1.0 || c < -1.0 || c.isNaN { return .nan }
        let span = deg(Foundation.acos(c)) / 15.0
        return noon + (ccw ? -span : span)
    }

    private static func utcCalendar() -> Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(secondsFromGMT: 0)!
        return cal
    }

    /// Epoch ms for fajr..isha on civil date y-m-d (index order = `order`).
    static func compute(y: Int, m: Int, d: Int, opts o: Opts) -> [Int64] {
        var r = computeAt(y: y, m: m, d: d, opts: o)
        if (r[1] == Int64.min || r[4] == Int64.min) && abs(o.lat) > 65.0 {
            var o2 = o
            o2.lat = o.lat > 0 ? 65.0 : -65.0
            r = computeAt(y: y, m: m, d: d, opts: o2)
        }
        return r
    }

    private static func computeAt(y: Int, m: Int, d: Int, opts o: Opts) -> [Int64] {
        let mDef = method(o.method)
        let lat = o.lat
        let lng = o.lng
        let jd = julian(y: y, m: m, d: d) - lng / (15.0 * 24.0)
        var t: [Double] = [5, 6, 12, 13, 18, 18, 18] // fajr, sunrise, dhuhr, asr, sunset, maghrib, isha
        let rise = 0.833
        for _ in 0..<2 {
            let p = t.map { $0 / 24.0 }
            let asrFactor: Double = o.asr == "hanafi" ? 2.0 : 1.0
            let asrAngle = -deg(Foundation.atan(1.0 / (asrFactor + dtan(abs(lat - sunPos(jd + p[3]).decl)))))
            t = [
                angleTime(jd, lat, mDef.fajr, p[0], true),
                angleTime(jd, lat, rise, p[1], true),
                midDay(jd, p[2]),
                angleTime(jd, lat, asrAngle, p[3], false),
                angleTime(jd, lat, rise, p[4], false),
                mDef.maghribDeg > 0 ? angleTime(jd, lat, mDef.maghribDeg, p[5], false) : angleTime(jd, lat, rise, p[5], false),
                mDef.ishaMin > 0 ? .nan : angleTime(jd, lat, mDef.isha, p[6], false)
            ]
        }
        if mDef.ishaMin > 0 {
            t[6] = t[5] + mDef.ishaMin / 60.0
        }
        let night = 24.0 + t[1] - t[4]
        let rule = o.highLat.isEmpty ? "angle" : o.highLat
        let none = rule == "none"
        let r2 = none ? "angle" : rule
        if !night.isNaN {
            let fp = portion(r2, mDef.fajr) * night
            if t[0].isNaN || (!none && t[1] - t[0] > fp) {
                t[0] = t[1] - fp
            }
            if mDef.ishaMin <= 0 {
                let ip = portion(r2, mDef.isha) * night
                if t[6].isNaN || (!none && t[6] - t[4] > ip) {
                    t[6] = t[4] + ip
                }
            }
            if mDef.maghribDeg > 0 {
                let mp = portion(r2, mDef.maghribDeg) * night
                if t[5].isNaN || (!none && t[5] - t[4] > mp) {
                    t[5] = t[4] + mp
                }
            }
        }
        let six = [t[0], t[1], t[2], t[3], t[5], t[6]]
        let cal = utcCalendar()
        let baseDate = cal.date(from: DateComponents(year: y, month: m, day: d, hour: 0, minute: 0, second: 0))!
        let baseMs = Int64((baseDate.timeIntervalSince1970 * 1000.0).rounded())
        var out = [Int64](repeating: Int64.min, count: 6)
        for k in 0..<6 {
            var madj = 0
            if let adj = mDef.adj {
                if k == 1 { madj = adj[0] }
                else if k == 2 { madj = adj[1] }
                else if k == 3 { madj = adj[2] }
                else if k == 4 { madj = adj[3] }
            }
            let userAdj = k < o.adj.count ? o.adj[k] : 0
            let h = six[k] - lng / 15.0 + Double(userAdj + madj) / 60.0
            if h.isNaN {
                out[k] = Int64.min
            } else {
                // Match Java/JS Math.round (half toward +infinity)
                let roundedMin = Int64(Foundation.floor(h * 60.0 + 0.5))
                out[k] = baseMs + roundedMin * 60_000
            }
        }
        return out
    }

    static func day(y: Int, m: Int, d: Int, opts o: Opts) -> Day {
        let t = compute(y: y, m: m, d: d, opts: o)
        let cal = utcCalendar()
        let curDate = cal.date(from: DateComponents(year: y, month: m, day: d))!
        let nextDate = cal.date(byAdding: .day, value: 1, to: curDate)!
        let nc = cal.dateComponents([.year, .month, .day], from: nextDate)
        let tn = compute(y: nc.year!, m: nc.month!, d: nc.day!, opts: o)

        var r = Day()
        r.y = y
        r.m = m
        r.d = d
        r.fajr = t[0]
        r.sunrise = t[1]
        r.dhuhr = t[2]
        r.asr = t[3]
        r.maghrib = t[4]
        r.isha = t[5]
        r.nextFajr = tn[0]
        let night = r.nextFajr - r.maghrib
        r.midnight = r.maghrib + night / 2
        r.lastThird = r.maghrib + (night * 2) / 3
        r.duhaStart = r.sunrise + Int64(o.ds) * 60_000
        r.duhaEnd = r.dhuhr - Int64(o.de) * 60_000
        return r
    }

    static func zone(_ o: Opts) -> TimeZone {
        if !o.tz.isEmpty, let tz = TimeZone(identifier: o.tz) {
            return tz
        }
        return TimeZone.current
    }

    static func dayAt(ms: Int64, offset: Int, opts o: Opts) -> Day {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = zone(o)
        let ref = Date(timeIntervalSince1970: Double(ms) / 1000.0)
        let shifted = cal.date(byAdding: .day, value: offset, to: ref)!
        let comps = cal.dateComponents([.year, .month, .day], from: shifted)
        return day(y: comps.year!, m: comps.month!, d: comps.day!, opts: o)
    }

    static func key(_ d: Day) -> String {
        String(format: "%04d-%02d-%02d", d.y, d.m, d.d)
    }
}
