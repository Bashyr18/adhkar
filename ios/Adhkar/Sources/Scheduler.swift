import Foundation
import UserNotifications

/// Schedules upcoming prayer, adhkār, Sunnah, Ramaḍān and Jumuʿah notifications via UNUserNotificationCenter,
/// keeping within Apple's 64-pending-notification limit by scheduling the soonest 60 events across the coming days.
final class Scheduler {
    static let shared = Scheduler()

    static let chPrayer = "prayer_tap"
    static let chAdhan = "prayer_adhan"
    static let chAdhkar = "adhkar"
    static let chSunnah = "sunnah"

    static let catPrayer = "ADHKAR_PRAYER"
    static let catAdhkar = "ADHKAR_SNOOZE"
    static let catAction = "ADHKAR_ACTION"

    static let actPrayed = "ACTION_PRAYED"
    static let actAfterPrayer = "ACTION_AFTER_PRAYER"
    static let actSnooze15 = "ACTION_SNOOZE_15"
    static let actOpen = "ACTION_OPEN"

    static let maxScheduled = 60
    private static let minMs: Int64 = 60_000

    struct Ev: Equatable {
        let id: String
        let at: Int64
        let ch: String
        let title: String
        let text: String
        let route: String
        let action: String?
        let actionRoute: String?
        let snooze: Bool
    }

    private let center = UNUserNotificationCenter.current()
    private let statusLock = NSLock()
    private let scheduleQueue = DispatchQueue(label: "com.adhkar.app.scheduler", qos: .utility)
    private var cachedStatus: UNAuthorizationStatus = .notDetermined

    var isAuthorized: Bool {
        let st = statusLock.withLock { cachedStatus }
        return st == .authorized || st == .provisional || st == .ephemeral
    }

    var isDenied: Bool {
        statusLock.withLock { cachedStatus } == .denied
    }

    func refreshAuthorizationStatus(completion: ((UNAuthorizationStatus) -> Void)? = nil) {
        center.getNotificationSettings { [weak self] settings in
            guard let self = self else { return }
            self.statusLock.withLock { self.cachedStatus = settings.authorizationStatus }
            completion?(settings.authorizationStatus)
        }
    }

    func registerCategories() {
        let prayed = UNNotificationAction(
            identifier: Self.actPrayed,
            title: L.t("Prayed", "صلّيت"),
            options: []
        )
        let afterPrayer = UNNotificationAction(
            identifier: Self.actAfterPrayer,
            title: L.t("After-prayer adhkār", "أذكار بعد الصلاة"),
            options: [.foreground]
        )
        let prayerCategory = UNNotificationCategory(
            identifier: Self.catPrayer,
            actions: [prayed, afterPrayer],
            intentIdentifiers: [],
            options: []
        )

        let begin = UNNotificationAction(
            identifier: Self.actOpen,
            title: L.t("Begin", "ابدأ"),
            options: [.foreground]
        )
        let snooze = UNNotificationAction(
            identifier: Self.actSnooze15,
            title: L.t("In 15 min", "بعد ١٥ دقيقة"),
            options: []
        )
        let adhkarCategory = UNNotificationCategory(
            identifier: Self.catAdhkar,
            actions: [begin, snooze],
            intentIdentifiers: [],
            options: []
        )

        let openAction = UNNotificationAction(
            identifier: Self.actOpen,
            title: L.t("Open", "فتح"),
            options: [.foreground]
        )
        let actionCategory = UNNotificationCategory(
            identifier: Self.catAction,
            actions: [openAction],
            intentIdentifiers: [],
            options: []
        )

        center.setNotificationCategories([prayerCategory, adhkarCategory, actionCategory])
    }

    func requestAuthorization(onResult: @escaping (Bool) -> Void) -> Bool {
        if isAuthorized {
            return true
        }
        center.requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, _ in
            self?.refreshAuthorizationStatus { _ in
                DispatchQueue.main.async {
                    if granted {
                        self?.scheduleAll()
                    }
                    onResult(granted)
                }
            }
        }
        return false
    }

    func notificationStateJSON(store: Store = .shared) -> String {
        let obj: [String: Any] = [
            "granted": isAuthorized,
            "exact": true,
            "nextAt": store.nextReminderAt
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: obj),
              let str = String(data: data, encoding: .utf8) else {
            return "{\"granted\":false,\"exact\":true,\"nextAt\":0}"
        }
        return str
    }

    /// Computes all reminder events for the civil day containing `nowMs` shifted by `off` days.
    static func events(cfg: [String: Any], opts o: PrayerCalc.Opts, nowMs: Int64, off: Int) -> [Ev] {
        var out: [Ev] = []
        guard let n = cfg["notif"] as? [String: Any], Store.boolVal(n["enabled"], default: false) else {
            return out
        }

        let d = PrayerCalc.dayAt(ms: nowMs, offset: off, opts: o)
        let key = PrayerCalc.key(d)
        let place = Store.locName(from: cfg)
        let excused = Store.boolVal(cfg["excused"], default: false)

        // Planned fasts (reminder at Maghrib the evening before)
        if let plan = cfg["fastPlan"] as? [String], !excused {
            let tm = PrayerCalc.dayAt(ms: nowMs, offset: off + 1, opts: o)
            let tk = PrayerCalc.key(tm)
            if plan.contains(tk) && !Store.noFastDay(cfg: cfg, y: tm.y, m: tm.m, d: tm.d) {
                let fajrTxt = Store.fmtTime(cfg: cfg, opts: o, ms: tm.fajr)
                out.append(Ev(
                    id: "fp-\(key)",
                    at: d.maghrib,
                    ch: chSunnah,
                    title: L.t("Tomorrow you plan to fast", "غدًا تنوي الصيام"),
                    text: L.t(
                        "Make your intention tonight, and eat suhūr before Fajr at \(fajrTxt).",
                        "انوِ الليلة، وتسحّر قبل الفجر \(fajrTxt)."
                    ),
                    route: "#/calendar",
                    action: nil,
                    actionRoute: nil,
                    snooze: false
                ))
            }
        }

        let today = cfg["today"] as? [String: Any]
        let smart = Store.boolVal(n["smart"], default: true) && today != nil && key == (today?["key"] as? String)
        let pr = excused ? nil : (n["prayers"] as? [String: Any])
        let pre = Store.intVal(n["pre"], default: 0)
        let atTime = Store.boolVal(n["adhan"], default: true) ? chAdhan : chPrayer

        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = PrayerCalc.zone(o)
        let dhuhrDate = Date(timeIntervalSince1970: Double(d.dhuhr) / 1000.0)
        let isFriday = cal.component(.weekday, from: dhuhrDate) == 6 // Sunday = 1, Friday = 6
        let sis = (cfg["gender"] as? String) == "f"

        for k in PrayerCalc.prayers {
            let at = d.get(k)
            let nm: String
            if isFriday && k == "dhuhr" {
                nm = sis ? L.t("Jumuʿah or Ẓuhr", "الجمعة أو الظهر") : L.t("Jumuʿah", "الجمعة")
            } else {
                nm = L.prayer(k)
            }
            if let pr = pr, Store.boolVal(pr[k], default: false) {
                let timeTxt = Store.fmtTime(cfg: cfg, opts: o, ms: at)
                let placeEn = place.isEmpty ? "" : " in \(place)"
                let placeAr = place.isEmpty ? "" : " في \(place)"
                out.append(Ev(
                    id: "p-\(k)-\(key)",
                    at: at,
                    ch: atTime,
                    title: "\(nm) · \(timeTxt)",
                    text: L.t(
                        "It is time for \(nm)\(placeEn). Then the adhkār after the prayer.",
                        "حان وقت \(nm)\(placeAr)، ثم أذكار بعد الصلاة."
                    ),
                    route: "#/salah",
                    action: L.t("After-prayer adhkār", "أذكار بعد الصلاة"),
                    actionRoute: "#/r/salah/0/\(k)",
                    snooze: false
                ))
                if pre > 0 {
                    out.append(Ev(
                        id: "q-\(k)-\(key)",
                        at: at - Int64(pre) * minMs,
                        ch: chPrayer,
                        title: L.t("\(nm) in \(pre) minutes", "\(nm) بعد \(L.n(pre)) دقيقة"),
                        text: "\(timeTxt)\(L.t(" · a moment to make wuḍūʾ", " · وقت للوضوء"))",
                        route: "#/salah",
                        action: nil,
                        actionRoute: nil,
                        snooze: false
                    ))
                }
            }
        }

        // Morning adhkār
        if let m = n["morning"] as? [String: Any],
           Store.boolVal(m["on"], default: false),
           !(smart && Store.boolVal(today?["morning"], default: false)) {
            let after = Int64(Store.intVal(m["after"], default: 20)) * minMs
            if (m["from"] as? String) == "sunrise" {
                out.append(Ev(
                    id: "m-\(key)",
                    at: d.sunrise + after,
                    ch: chAdhkar,
                    title: L.t("Morning adhkār", "أذكار الصباح"),
                    text: L.t("Begin the day with remembrance.", "ابدأ يومك بذكر الله."),
                    route: "#/c/morning",
                    action: L.t("Begin", "ابدأ"),
                    actionRoute: "#/r/morning/0",
                    snooze: true
                ))
            } else {
                let srTxt = Store.fmtTime(cfg: cfg, opts: o, ms: d.sunrise)
                out.append(Ev(
                    id: "m-\(key)",
                    at: d.fajr + after,
                    ch: chAdhkar,
                    title: L.t("Morning adhkār", "أذكار الصباح"),
                    text: L.t(
                        "Begin the day with remembrance. Before sunrise at \(srTxt) is best.",
                        "ابدأ يومك بذكر الله، والأفضل قبل الشروق \(srTxt)."
                    ),
                    route: "#/c/morning",
                    action: L.t("Begin", "ابدأ"),
                    actionRoute: "#/r/morning/0",
                    snooze: true
                ))
            }
        }

        // Evening adhkār
        if let e = n["evening"] as? [String: Any],
           Store.boolVal(e["on"], default: false),
           !(smart && Store.boolVal(today?["evening"], default: false)) {
            let after = Int64(Store.intVal(e["after"], default: 30)) * minMs
            if (e["from"] as? String) == "maghrib" {
                out.append(Ev(
                    id: "e-\(key)",
                    at: d.maghrib + after,
                    ch: chAdhkar,
                    title: L.t("Evening adhkār", "أذكار المساء"),
                    text: L.t("Protect your night with remembrance.", "احفظ ليلتك بذكر الله."),
                    route: "#/c/evening",
                    action: L.t("Begin", "ابدأ"),
                    actionRoute: "#/r/evening/0",
                    snooze: true
                ))
            } else {
                let magTxt = Store.fmtTime(cfg: cfg, opts: o, ms: d.maghrib)
                out.append(Ev(
                    id: "e-\(key)",
                    at: d.asr + after,
                    ch: chAdhkar,
                    title: L.t("Evening adhkār", "أذكار المساء"),
                    text: L.t(
                        "Protect your evening with remembrance. Maghrib is at \(magTxt).",
                        "احفظ مساءك بذكر الله. المغرب \(magTxt)."
                    ),
                    route: "#/c/evening",
                    action: L.t("Begin", "ابدأ"),
                    actionRoute: "#/r/evening/0",
                    snooze: true
                ))
            }
        }

        // Sleep adhkār
        if let sl = n["sleep"] as? [String: Any],
           Store.boolVal(sl["on"], default: false),
           !(smart && Store.boolVal(today?["sleep"], default: false)) {
            var sh = 22
            var sm = 30
            let parts = ((sl["at"] as? String) ?? "22:30").split(separator: ":")
            if parts.count >= 2,
               let h0 = Int(parts[0].trimmingCharacters(in: .whitespaces)),
               let m0 = Int(parts[1].trimmingCharacters(in: .whitespaces)),
               (0...23).contains(h0), (0...59).contains(m0) {
                sh = h0
                sm = m0
            }
            if let sleepDate = cal.date(from: DateComponents(year: d.y, month: d.m, day: d.d, hour: sh, minute: sm, second: 0)) {
                out.append(Ev(
                    id: "s-\(key)",
                    at: Int64(sleepDate.timeIntervalSince1970 * 1000.0),
                    ch: chAdhkar,
                    title: L.t("Before you sleep", "قبل النوم"),
                    text: L.t("The three Quls, Āyat al-Kursī and the adhkār of sleep.", "المعوذات وآية الكرسي وأذكار النوم."),
                    route: "#/c/sleep",
                    action: L.t("Begin", "ابدأ"),
                    actionRoute: "#/r/sleep/0",
                    snooze: true
                ))
            }
        }

        // Ḍuḥā
        if let du = n["duha"] as? [String: Any],
           Store.boolVal(du["on"], default: false),
           !(smart && Store.boolVal(today?["duha"], default: false)) {
            let endTxt = Store.fmtTime(cfg: cfg, opts: o, ms: d.duhaEnd)
            out.append(Ev(
                id: "d-\(key)",
                at: d.duhaStart,
                ch: chSunnah,
                title: L.t("Ḍuḥā time", "وقت الضحى"),
                text: L.t(
                    "The window is open until \(endTxt). Two rakʿahs suffice.",
                    "يمتد الوقت إلى \(endTxt)، وتكفي ركعتان."
                ),
                route: "#/duha",
                action: nil,
                actionRoute: nil,
                snooze: false
            ))
        }

        // Cycle reminder (discreet wording on lock screen)
        if let cy = cfg["cycle"] as? [String: Any] {
            let cyOn = Store.boolVal(cy["on"], default: false)
            if !cyOn && key == (cy["next"] as? String) {
                out.append(Ev(
                    id: "cy-\(key)",
                    at: d.sunrise + 60 * minMs,
                    ch: chSunnah,
                    title: L.t("A gentle reminder", "تذكير لطيف"),
                    text: L.t("Tap to update your days.", "اضغطي لتحديث أيامك."),
                    route: "#/",
                    action: nil,
                    actionRoute: nil,
                    snooze: false
                ))
            }
            if cyOn && key == (cy["end"] as? String) {
                out.append(Ev(
                    id: "cz-\(key)",
                    at: d.dhuhr - 30 * minMs,
                    ch: chSunnah,
                    title: L.t("A gentle reminder", "تذكير لطيف"),
                    text: L.t("Your usual days are complete. Tap when you are ready.", "اكتملت أيام عادتك. اضغطي حين تكونين مستعدة."),
                    route: "#/",
                    action: nil,
                    actionRoute: nil,
                    snooze: false
                ))
            }
        }

        // Last third of the night & duʿāʾ journal nudges
        let jr = cfg["journal"] as? [String: Any]
        let jn = jr?["nudge"] as? [String: Any]
        let dua = (jr?["dua"] as? String) ?? ""
        let yours = dua.isEmpty ? "" : L.t("\nYour duʿāʾ: ", "\nدعاؤك: ") + dua
        let jNight = Store.boolVal(jn?["night"], default: false) && !dua.isEmpty
        let jFri = Store.boolVal(jn?["friday"], default: false) && !dua.isEmpty

        let ni = n["night"] as? [String: Any]
        if Store.boolVal(ni?["on"], default: false) || jNight {
            let offMin = Int64(Store.intVal(ni?["off"], default: 0)) * minMs
            let at = min(d.lastThird + offMin, d.nextFajr - 15 * minMs)
            let nfTxt = Store.fmtTime(cfg: cfg, opts: o, ms: d.nextFajr)
            out.append(Ev(
                id: "n-\(key)",
                at: at,
                ch: chSunnah,
                title: L.t("The last third of the night", "ثلث الليل الآخر"),
                text: L.t(
                    "It lasts until Fajr at \(nfTxt). Call upon your Lord.",
                    "يمتد إلى الفجر \(nfTxt)، فادعُ ربك."
                ) + (jNight ? yours : ""),
                route: jNight ? "#/journal" : "#/night",
                action: nil,
                actionRoute: nil,
                snooze: false
            ))
        }

        if let ja = jn?["adhan"] as? String, !dua.isEmpty, !ja.isEmpty, d.get(ja) > 0 {
            out.append(Ev(
                id: "ja-\(key)",
                at: d.get(ja) + 2 * minMs,
                ch: chSunnah,
                title: L.t("Between adhān and iqāmah", "بين الأذان والإقامة"),
                text: L.t("Duʿāʾ now is not rejected.", "الدعاء الآن لا يُرد.") + yours,
                route: "#/journal",
                action: nil,
                actionRoute: nil,
                snooze: false
            ))
        }

        // Ramaḍān (suḥūr & ifṭār)
        if let rm = n["ramadan"] as? [String: Any], !excused {
            let nx = PrayerCalc.dayAt(ms: nowMs, offset: off + 1, opts: o)
            let imsak = Int64(Store.intVal(cfg["imsak"], default: 0)) * minMs
            if Store.boolVal(rm["suhoor"], default: true) && Store.hijriMonth(cfg: cfg, y: nx.y, m: nx.m, d: nx.d) == 9 {
                let suhoorMin = Int64(Store.intVal(rm["suhoorMin"], default: 45)) * minMs
                let endTxt = Store.fmtTime(cfg: cfg, opts: o, ms: nx.fajr - imsak)
                out.append(Ev(
                    id: "rs-\(key)",
                    at: nx.fajr - imsak - suhoorMin,
                    ch: chAdhkar,
                    title: L.t("Suhūr", "السحور"),
                    text: L.t(
                        "Eat before \(endTxt). There is blessing in suhūr.",
                        "تسحّر قبل \(endTxt)، فإن في السحور بركة."
                    ),
                    route: "#/ramadan",
                    action: nil,
                    actionRoute: nil,
                    snooze: false
                ))
            }
            if Store.boolVal(rm["iftar"], default: true) && Store.hijriMonth(cfg: cfg, y: d.y, m: d.m, d: d.d) == 9 {
                let magTxt = Store.fmtTime(cfg: cfg, opts: o, ms: d.maghrib)
                out.append(Ev(
                    id: "ri-\(key)",
                    at: d.maghrib,
                    ch: chPrayer,
                    title: L.t("Ifṭār · ", "الإفطار · ") + magTxt,
                    text: L.t(
                        "Dhahabaẓ-ẓama’u wabtallatil-ʿurūq, wa thabatal-ajru in shā’ Allāh.",
                        "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ العُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ"
                    ),
                    route: "#/ramadan",
                    action: L.t("Ifṭār duʿāʾ", "دعاء الإفطار"),
                    actionRoute: "#/r/ramadan/1",
                    snooze: false
                ))
            }
        }

        // Jumuʿah
        let fr = n["friday"] as? [String: Any]
        let ju = cfg["jumuah"] as? [String: Any]
        let kahfRead = key == (ju?["kahf"] as? String)
        if isFriday && Store.boolVal(fr?["on"], default: false) && !kahfRead {
            out.append(Ev(
                id: "fk-\(key)",
                at: d.sunrise + 120 * minMs,
                ch: chSunnah,
                title: L.t("Yawm al-Jumuʿah", "يوم الجمعة"),
                text: L.t("Read Sūrat al-Kahf and send abundant ṣalawāt upon the Prophet ﷺ.", "اقرأ سورة الكهف وأكثر من الصلاة على النبي ﷺ."),
                route: "#/kahf",
                action: L.t("Read al-Kahf", "اقرأ الكهف"),
                actionRoute: "#/kahf",
                snooze: false
            ))
        }
        if isFriday && (Store.boolVal(fr?["on"], default: false) || jFri) {
            let magTxt = Store.fmtTime(cfg: cfg, opts: o, ms: d.maghrib)
            out.append(Ev(
                id: "fh-\(key)",
                at: d.maghrib - 60 * minMs,
                ch: chSunnah,
                title: L.t("The hour of response", "ساعة الإجابة"),
                text: L.t(
                    "The last hour before Maghrib on Friday, until \(magTxt). Make duʿāʾ.",
                    "آخر ساعة قبل مغرب الجمعة، حتى \(magTxt)، فادعُ الله."
                ) + (jFri ? yours : ""),
                route: jFri ? "#/journal" : "#/jumuah",
                action: L.t("Your duʿāʾ list", "قائمة دعائك"),
                actionRoute: "#/journal",
                snooze: false
            ))
        }

        return out
    }

    /// Returns the soonest `limit` upcoming events sorted chronologically.
    static func upcoming(cfg: [String: Any], nowMs: Int64, days: Int = 10, limit: Int = maxScheduled) -> [Ev] {
        guard let opts = Store.opts(from: cfg) else { return [] }
        var all: [Ev] = []
        for off in 0..<days {
            all.append(contentsOf: events(cfg: cfg, opts: opts, nowMs: nowMs, off: off))
        }
        let filtered = all
            .filter { $0.at > nowMs + 5_000 }
            .sorted { $0.at < $1.at }
        return Array(filtered.prefix(limit))
    }

    func scheduleAll(store: Store = .shared, completion: (() -> Void)? = nil) {
        scheduleQueue.async { [weak self] in
            guard let self = self else {
                DispatchQueue.main.async { completion?() }
                return
            }
            let cfg = store.config()
            self.registerCategories()

            let nowMs = Int64(Date().timeIntervalSince1970 * 1000.0)
            let list = Self.upcoming(cfg: cfg, nowMs: nowMs)
            store.nextReminderAt = list.first?.at ?? 0

            let done = DispatchSemaphore(value: 0)
            self.center.getPendingNotificationRequests { pending in
                let toRemove = pending.map { $0.identifier }.filter { $0.hasPrefix("adhkar.") }
                if !toRemove.isEmpty {
                    self.center.removePendingNotificationRequests(withIdentifiers: toRemove)
                }
                guard !list.isEmpty else {
                    done.signal()
                    return
                }
                var greg = Calendar(identifier: .gregorian)
                greg.timeZone = TimeZone.current
                let group = DispatchGroup()
                for ev in list {
                    let content = self.makeContent(for: ev)
                    let triggerDate = Date(timeIntervalSince1970: Double(ev.at) / 1000.0)
                    var comps = greg.dateComponents([.year, .month, .day, .hour, .minute, .second], from: triggerDate)
                    comps.calendar = greg
                    comps.timeZone = TimeZone.current
                    let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                    let req = UNNotificationRequest(identifier: "adhkar.\(ev.id)", content: content, trigger: trigger)
                    group.enter()
                    self.center.add(req) { _ in group.leave() }
                }
                group.notify(queue: .global(qos: .utility)) {
                    done.signal()
                }
            }
            _ = done.wait(timeout: .now() + 15)
            DispatchQueue.main.async {
                completion?()
            }
        }
    }

    func testReminder(title: String, body: String, store: Store = .shared) -> Bool {
        guard isAuthorized else { return false }
        let cfg = store.config()
        let notif = cfg["notif"] as? [String: Any]
        let useAdhan = Store.boolVal(notif?["adhan"], default: true)
        let ev = Ev(
            id: "test-reminder",
            at: Int64(Date().timeIntervalSince1970 * 1000.0) + 1_000,
            ch: useAdhan ? Self.chAdhan : Self.chPrayer,
            title: title,
            text: body,
            route: "#/settings/notifications",
            action: nil,
            actionRoute: nil,
            snooze: false
        )
        let content = makeContent(for: ev)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let req = UNNotificationRequest(identifier: "adhkar.test", content: content, trigger: trigger)
        center.add(req, withCompletionHandler: nil)
        return true
    }

    func scheduleSnooze(from userInfo: [AnyHashable: Any]) {
        let id = (userInfo["id"] as? String) ?? "snoozed"
        let ch = (userInfo["ch"] as? String) ?? Self.chAdhkar
        let title = (userInfo["title"] as? String) ?? L.t("Adhkār", "أذكار")
        let text = (userInfo["text"] as? String) ?? ""
        let route = (userInfo["route"] as? String) ?? "#/"
        let actionRoute = userInfo["actionRoute"] as? String

        let ev = Ev(
            id: "\(id)-snooze",
            at: Int64(Date().timeIntervalSince1970 * 1000.0) + 15 * Self.minMs,
            ch: ch,
            title: title,
            text: text,
            route: route,
            action: actionRoute != nil ? L.t("Begin", "ابدأ") : nil,
            actionRoute: actionRoute,
            snooze: true
        )
        let content = makeContent(for: ev)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 15 * 60, repeats: false)
        let req = UNNotificationRequest(identifier: "adhkar.snooze.\(id)", content: content, trigger: trigger)
        center.add(req, withCompletionHandler: nil)
    }

    private func makeContent(for ev: Ev) -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        content.title = ev.title
        content.body = ev.text
        switch ev.ch {
        case Self.chAdhan:
            content.sound = UNNotificationSound(named: UNNotificationSoundName("adhan_takbir.caf"))
        case Self.chPrayer:
            content.sound = UNNotificationSound(named: UNNotificationSoundName("tap.caf"))
        default:
            content.sound = .default
        }

        var info: [String: String] = [
            "id": ev.id,
            "ch": ev.ch,
            "title": ev.title,
            "text": ev.text,
            "route": ev.route
        ]
        if let ar = ev.actionRoute {
            info["actionRoute"] = ar
        }

        if (ev.ch == Self.chAdhan || ev.ch == Self.chPrayer),
           ev.id.hasPrefix("p-"),
           ev.id.count > 13 {
            // p-<prayer>-YYYY-MM-DD
            let day = String(ev.id.suffix(10))
            let start = ev.id.index(ev.id.startIndex, offsetBy: 2)
            let end = ev.id.index(ev.id.endIndex, offsetBy: -11)
            if start < end {
                info["prayer"] = String(ev.id[start..<end])
                info["day"] = day
                content.categoryIdentifier = Self.catPrayer
            }
        } else if ev.snooze {
            content.categoryIdentifier = Self.catAdhkar
        } else if ev.actionRoute != nil {
            content.categoryIdentifier = Self.catAction
        }

        content.userInfo = info
        return content
    }
}
