import XCTest
@testable import Adhkar

final class PrayerCalcTests: XCTestCase {
    private func minutesOfDay(_ ms: Int64, tz: String) -> Int {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: tz)!
        let c = cal.dateComponents([.hour, .minute], from: Date(timeIntervalSince1970: Double(ms) / 1000.0))
        return (c.hour ?? 0) * 60 + (c.minute ?? 0)
    }

    func testPublishedSunriseAndSunsetReferences() {
        let cases: [(String, Double, Double, String, Int, Int)] = [
            // London 2026-11-01: 06:56 / 16:33
            ("London", 51.5074, -0.1278, "Europe/London", 6 * 60 + 56, 16 * 60 + 33),
            // New York 2026-11-01: 06:26 / 16:53
            ("New York", 40.7128, -74.006, "America/New_York", 6 * 60 + 26, 16 * 60 + 53),
            // Makkah 2026-11-01: 06:24 / 17:46
            ("Makkah", 21.4225, 39.8262, "Asia/Riyadh", 6 * 60 + 24, 17 * 60 + 46)
        ]

        for (name, lat, lng, tz, expSunrise, expSunset) in cases {
            var opts = PrayerCalc.Opts()
            opts.lat = lat
            opts.lng = lng
            opts.method = "mwl"
            opts.tz = tz
            let day = PrayerCalc.day(y: 2026, m: 11, d: 1, opts: opts)
            let gotSunrise = minutesOfDay(day.sunrise, tz: tz)
            let gotSunset = minutesOfDay(day.maghrib, tz: tz)
            XCTAssertLessThanOrEqual(abs(gotSunrise - expSunrise), 3, "\(name) sunrise \(gotSunrise) vs \(expSunrise)")
            XCTAssertLessThanOrEqual(abs(gotSunset - expSunset), 3, "\(name) sunset \(gotSunset) vs \(expSunset)")
        }
    }

    func testChronologicalOrderingAcrossAllMethodsAndSeasons() {
        let methods = [
            "mwl", "isna", "egypt", "makkah", "karachi", "dubai", "qatar", "kuwait",
            "singapore", "jakim", "kemenag", "turkey", "france", "russia", "morocco",
            "algeria", "tunisia", "jordan"
        ]
        let dates = [(2026, 3, 20), (2026, 6, 21), (2026, 11, 1), (2026, 12, 21)]
        let places: [(Double, Double)] = [
            (51.5074, -0.1278),   // London
            (21.4225, 39.8262),   // Makkah
            (40.7128, -74.006),   // New York
            (-33.8688, 151.2093)  // Sydney (southern hemisphere)
        ]

        for (idx, method) in methods.enumerated() {
            let (lat, lng) = places[idx % places.count]
            for (y, m, d) in dates {
                var opts = PrayerCalc.Opts()
                opts.lat = lat
                opts.lng = lng
                opts.method = method
                opts.asr = idx % 2 == 0 ? "std" : "hanafi"
                opts.highLat = "angle"

                let day = PrayerCalc.day(y: y, m: m, d: d, opts: opts)
                let seq = [day.fajr, day.sunrise, day.dhuhr, day.asr, day.maghrib, day.isha, day.nextFajr]
                for i in 0..<seq.count {
                    XCTAssertNotEqual(seq[i], Int64.min, "Missing time for \(method) \(y)-\(m)-\(d)")
                    if i > 0 {
                        XCTAssertGreaterThan(seq[i], seq[i - 1], "Out of order for \(method) \(y)-\(m)-\(d)")
                    }
                }
                XCTAssertGreaterThan(day.lastThird, day.midnight)
                XCTAssertLessThan(day.lastThird, day.nextFajr)
            }
        }
    }

    func testPolarLatitudeFallbackProducesValidTimes() {
        for rule in ["angle", "mid", "seventh"] {
            var opts = PrayerCalc.Opts()
            opts.lat = 69.6492  // Tromsø (midnight sun in June)
            opts.lng = 18.9553
            opts.method = "mwl"
            opts.highLat = rule
            let day = PrayerCalc.day(y: 2026, m: 6, d: 21, opts: opts)
            let seq = [day.fajr, day.sunrise, day.dhuhr, day.asr, day.maghrib, day.isha, day.nextFajr]
            for v in seq {
                XCTAssertNotEqual(v, Int64.min, "Polar fallback must yield finite times for \(rule)")
            }
            for i in 1..<seq.count {
                // Under "mid", isha and nextFajr meet at exact solar midnight (<=)
                XCTAssertGreaterThanOrEqual(seq[i], seq[i - 1], "Polar ordering failed for \(rule)")
            }
        }
    }
}
