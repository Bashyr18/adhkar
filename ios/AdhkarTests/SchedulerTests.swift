import XCTest
import UserNotifications
@testable import Adhkar

final class SchedulerTests: XCTestCase {
    private func sampleConfig(
        lang: String = "en",
        gender: String = "m",
        excused: Bool = false,
        smart: Bool = true,
        morningDone: Bool = false,
        todayKey: String = "2026-11-06"
    ) -> [String: Any] {
        [
            "lang": lang,
            "gender": gender,
            "excused": excused,
            "h24": true,
            "loc": ["lat": 51.5074, "lng": -0.1278, "name": "London", "tz": "Europe/London"],
            "calc": ["method": "mwl", "asr": "std", "highLat": "angle"],
            "offsets": ["ds": 20, "de": 15],
            "today": [
                "key": todayKey,
                "morning": morningDone,
                "evening": false,
                "sleep": false,
                "duha": false
            ],
            "notif": [
                "enabled": true,
                "adhan": true,
                "smart": smart,
                "pre": 10,
                "prayers": ["fajr": true, "dhuhr": true, "asr": true, "maghrib": true, "isha": true],
                "morning": ["on": true, "from": "fajr", "after": 20],
                "evening": ["on": true, "from": "asr", "after": 30],
                "sleep": ["on": true, "at": "22:30"],
                "duha": ["on": true],
                "night": ["on": true, "off": 0],
                "friday": ["on": true],
                "ramadan": ["suhoor": true, "suhoorMin": 45, "iftar": true]
            ]
        ]
    }

    func testFridayEventsIncludeJumuahAndKahfAndHourOfResponse() {
        L.ar = false
        // 2026-11-06 is a Friday
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Europe/London")!
        let friday = cal.date(from: DateComponents(year: 2026, month: 11, day: 6, hour: 1, minute: 0))!
        let nowMs = Int64(friday.timeIntervalSince1970 * 1000.0)

        let cfg = sampleConfig(gender: "m", todayKey: "2026-11-06")
        let opts = Store.opts(from: cfg)!
        let evs = Scheduler.events(cfg: cfg, opts: opts, nowMs: nowMs, off: 0)

        let dhuhrEv = evs.first { $0.id == "p-dhuhr-2026-11-06" }
        XCTAssertNotNil(dhuhrEv)
        XCTAssertTrue(dhuhrEv!.title.contains("Jumuʿah"))
        XCTAssertEqual(dhuhrEv!.ch, Scheduler.chAdhan)
        XCTAssertTrue(evs.contains { $0.id == "fk-2026-11-06" })
        XCTAssertTrue(evs.contains { $0.id == "fh-2026-11-06" })
        XCTAssertTrue(evs.contains { $0.id == "q-fajr-2026-11-06" })

        // Sister wording for Friday Dhuhr
        let sisCfg = sampleConfig(gender: "f", todayKey: "2026-11-06")
        let sisEvs = Scheduler.events(cfg: sisCfg, opts: opts, nowMs: nowMs, off: 0)
        let sisDhuhr = sisEvs.first { $0.id == "p-dhuhr-2026-11-06" }
        XCTAssertTrue(sisDhuhr?.title.contains("Jumuʿah or Ẓuhr") == true)
    }

    func testMergedMaghribKeepsPrayedAndUsesIftarActionCategory() throws {
        let day = "2026-02-25"
        let cfg = sampleConfig(todayKey: day)
        let opts = try XCTUnwrap(Store.opts(from: cfg))
        let now = PrayerCalc.day(y: 2026, m: 2, d: 25, opts: opts).dhuhr
        let evs = Scheduler.events(cfg: cfg, opts: opts, nowMs: now, off: 0)
        let maghrib = try XCTUnwrap(evs.first { $0.id == "p-maghrib-\(day)" })
        let content = Scheduler.shared.makeContent(for: maghrib)
        XCTAssertEqual(content.categoryIdentifier, Scheduler.catIftarPrayer)
        XCTAssertEqual(content.userInfo["prayer"] as? String, "maghrib")
        XCTAssertEqual(content.userInfo["day"] as? String, day)
        XCTAssertEqual(content.userInfo["actionRoute"] as? String, "#/r/ramadan/1")
        XCTAssertFalse(evs.contains { $0.id == "ri-\(day)" })
    }

    func testSmartSkipAndExcusedMode() {
        L.ar = false
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Europe/London")!
        let day = cal.date(from: DateComponents(year: 2026, month: 11, day: 6, hour: 1, minute: 0))!
        let nowMs = Int64(day.timeIntervalSince1970 * 1000.0)

        let cfg = sampleConfig(excused: true, smart: true, morningDone: true, todayKey: "2026-11-06")
        let opts = Store.opts(from: cfg)!
        let evs = Scheduler.events(cfg: cfg, opts: opts, nowMs: nowMs, off: 0)

        XCTAssertFalse(evs.contains { $0.id.hasPrefix("p-") }, "Prayer reminders paused while excused")
        XCTAssertFalse(evs.contains { $0.id == "m-2026-11-06" }, "Completed morning adhkār skipped when smart is on")
        XCTAssertTrue(evs.contains { $0.id == "e-2026-11-06" }, "Uncompleted evening adhkār still scheduled")
    }

    func testUpcomingKeepsPreviousNightAfterMidnight() throws {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/London"))
        let date = try XCTUnwrap(cal.date(from: DateComponents(year: 2027, month: 2, day: 18, hour: 0, minute: 30)))
        let now = Int64(date.timeIntervalSince1970 * 1000.0)
        let cfg = sampleConfig(todayKey: "2027-02-18")
        let planned = Scheduler.upcoming(cfg: cfg, nowMs: now)
        XCTAssertTrue(planned.contains { $0.id == "n-2027-02-17" })
        XCTAssertTrue(planned.contains { $0.id == "rs-2027-02-17" })
        XCTAssertTrue(planned.allSatisfy { $0.at > now })
    }

    func testUpcomingRespectsAppleNotificationCap() {
        L.ar = false
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Europe/London")!
        let day = cal.date(from: DateComponents(year: 2026, month: 11, day: 6, hour: 1, minute: 0))!
        let nowMs = Int64(day.timeIntervalSince1970 * 1000.0)

        let cfg = sampleConfig()
        let upcoming = Scheduler.upcoming(cfg: cfg, nowMs: nowMs, days: 10, limit: Scheduler.maxScheduled)
        XCTAssertLessThanOrEqual(upcoming.count, Scheduler.maxScheduled)
        XCTAssertGreaterThan(upcoming.count, 30)
        for i in 1..<upcoming.count {
            XCTAssertGreaterThanOrEqual(upcoming[i].at, upcoming[i - 1].at)
        }
    }

    func testSnoozeExpiresAfterSessionWindow() throws {
        L.ar = false
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/London"))
        let cfg = sampleConfig(todayKey: "2026-11-06")

        // Mid-morning: morning adhkār window (until Dhuhr) is still open, so a new +15 min snooze is allowed.
        let morning = try XCTUnwrap(cal.date(from: DateComponents(year: 2026, month: 11, day: 6, hour: 9, minute: 0)))
        let morningMs = Int64(morning.timeIntervalSince1970 * 1000.0)
        let active = Scheduler.snoozeEvents(cfg: cfg, nowMs: morningMs)
        XCTAssertTrue(active.contains { $0.id == "m-2026-11-06" })

        // 10 minutes before Dhuhr: a brand-new +15 min snooze would pass Dhuhr, but an already-pending snooze
        // firing in 5 minutes is still within the active window and must be retained.
        let opts = try XCTUnwrap(Store.opts(from: cfg))
        let dhuhrMs = PrayerCalc.day(y: 2026, m: 11, d: 6, opts: opts).dhuhr
        let tenBeforeDhuhr = dhuhrMs - 10 * 60_000
        let tooLateForNew = Scheduler.snoozeEvents(cfg: cfg, nowMs: tenBeforeDhuhr)
        XCTAssertFalse(tooLateForNew.contains { $0.id == "m-2026-11-06" })
        let windows = Scheduler.activeSnoozeWindows(cfg: cfg, nowMs: tenBeforeDhuhr)
        let pendingFireAt = tenBeforeDhuhr + 5 * 60_000
        XCTAssertTrue(pendingFireAt < (windows["m-2026-11-06"] ?? 0))

        // Afternoon (after Dhuhr): morning adhkār window has closed, so snoozing is rejected and pending snoozes expire.
        let afternoon = try XCTUnwrap(cal.date(from: DateComponents(year: 2026, month: 11, day: 6, hour: 13, minute: 30)))
        let afternoonMs = Int64(afternoon.timeIntervalSince1970 * 1000.0)
        let expired = Scheduler.snoozeEvents(cfg: cfg, nowMs: afternoonMs)
        XCTAssertFalse(expired.contains { $0.id == "m-2026-11-06" })
        XCTAssertNil(Scheduler.activeSnoozeWindows(cfg: cfg, nowMs: afternoonMs)["m-2026-11-06"])
    }
}
