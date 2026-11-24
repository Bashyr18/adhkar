import CoreLocation
import CoreMotion
import Foundation

/// Native CoreLocation (GPS + CLGeocoder) and CoreMotion/CoreLocation Qibla compass bridge.
final class LocationCompass: NSObject, CLLocationManagerDelegate {
    private let sendJS: (String) -> Void
    private let manager = CLLocationManager()
    private let geocoder = CLGeocoder()
    private let motion = CMMotionManager()

    private var waitingForLocation = false
    private var locationTimeout: DispatchWorkItem?
    private var compassActive = false
    private var lastHeadingTime: TimeInterval = 0
    private var pitchDeg: Double = 0
    private var rollDeg: Double = 0

    init(sendJS: @escaping (String) -> Void) {
        self.sendJS = sendJS
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    private var isAuthorized: Bool {
        let st = manager.authorizationStatus
        return st == .authorizedWhenInUse || st == .authorizedAlways
    }

    /// Refresh location only if permission was already granted; never prompts.
    func locateQuiet() -> Bool {
        guard isAuthorized else { return false }
        DispatchQueue.main.async { [weak self] in
            self?.beginLocationRequest()
        }
        return true
    }

    func requestLocation() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            switch self.manager.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways:
                self.beginLocationRequest()
            case .notDetermined:
                self.waitingForLocation = true
                self.manager.requestWhenInUseAuthorization()
            case .denied, .restricted:
                self.sendLocationJSON(["error": "denied"])
            @unknown default:
                self.sendLocationJSON(["error": "fail"])
            }
        }
    }

    private func beginLocationRequest() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let enabled = CLLocationManager.locationServicesEnabled()
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                guard enabled else {
                    self.sendLocationJSON(["error": "off"])
                    return
                }
                self.startLocationLookup()
            }
        }
    }

    private func startLocationLookup() {
        if let cached = manager.location,
           Date().timeIntervalSince(cached.timestamp) < 30 * 60 {
            deliver(cached)
            return
        }
        waitingForLocation = true
        locationTimeout?.cancel()
        let fallback = manager.location
        let timeout = DispatchWorkItem { [weak self] in
            guard let self = self, self.waitingForLocation else { return }
            self.waitingForLocation = false
            if let fb = fallback {
                self.deliver(fb)
            } else {
                self.sendLocationJSON(["error": "timeout"])
            }
        }
        locationTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: timeout)
        manager.requestLocation()
    }

    private func deliver(_ loc: CLLocation) {
        waitingForLocation = false
        locationTimeout?.cancel()
        locationTimeout = nil

        var payload: [String: Any] = [
            "lat": loc.coordinate.latitude,
            "lng": loc.coordinate.longitude,
            "acc": loc.horizontalAccuracy
        ]

        var sent = false
        let finish: () -> Void = { [weak self] in
            guard !sent else { return }
            sent = true
            self?.sendLocationJSON(payload)
        }

        // Never wait more than 2.5 s for a place name; the web app falls back to the nearest city.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5, execute: finish)

        geocoder.cancelGeocode()
        geocoder.reverseGeocodeLocation(loc, preferredLocale: Locale(identifier: "en_US")) { placemarks, _ in
            if let p = placemarks?.first {
                if let name = p.locality ?? p.subAdministrativeArea ?? p.administrativeArea {
                    payload["name"] = name
                }
                if let cc = p.isoCountryCode {
                    payload["cc"] = cc
                }
                if let country = p.country {
                    payload["country"] = country
                }
            }
            DispatchQueue.main.async(execute: finish)
        }
    }

    private func sendLocationJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let str = String(data: data, encoding: .utf8) else { return }
        let quoted = AudioManager.jsQuote(str)
        sendJS("__native.onLocation&&__native.onLocation(\(quoted))")
    }

    // MARK: - Qibla compass

    func startCompass() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard CLLocationManager.headingAvailable() else { return }
            self.compassActive = true
            self.manager.headingFilter = 1
            self.manager.startUpdatingHeading()
            if self.motion.isDeviceMotionAvailable {
                self.motion.deviceMotionUpdateInterval = 1.0 / 30.0
                self.motion.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
                    guard let self = self, let att = data?.attitude else { return }
                    self.pitchDeg = att.pitch * 180.0 / .pi
                    self.rollDeg = att.roll * 180.0 / .pi
                }
            }
        }
    }

    func stopCompass() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.compassActive = false
            self.manager.stopUpdatingHeading()
            self.motion.stopDeviceMotionUpdates()
        }
    }

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard waitingForLocation else { return }
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            beginLocationRequest()
        case .denied, .restricted:
            waitingForLocation = false
            sendLocationJSON(["error": "denied"])
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard waitingForLocation, let loc = locations.last else { return }
        deliver(loc)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard waitingForLocation else { return }
        waitingForLocation = false
        locationTimeout?.cancel()
        if let fb = manager.location {
            deliver(fb)
        } else {
            sendLocationJSON(["error": "fail"])
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        guard compassActive else { return }
        let now = Date().timeIntervalSince1970
        guard now - lastHeadingTime >= 0.033 else { return }
        lastHeadingTime = now

        let hd = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        let accVal = newHeading.headingAccuracy
        let accLevel: Int
        if accVal < 0 { accLevel = 0 }
        else if accVal <= 15 { accLevel = 3 }
        else if accVal <= 30 { accLevel = 2 }
        else { accLevel = 1 }

        let args = String(format: "%.1f,%d,%.1f,%.1f", hd, accLevel, pitchDeg, rollDeg)
        sendJS("__native.onHeading&&__native.onHeading(\(args))")
    }
}
