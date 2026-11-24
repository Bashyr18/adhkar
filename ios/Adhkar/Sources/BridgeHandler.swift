import Foundation
import UIKit

/// UI operations provided by `MainViewController` to `BridgeHandler`.
protocol BridgeHost: AnyObject {
    func evalJS(_ code: String)
    func setCanBack(_ can: Bool)
    func onPageReady(ms: Double)
    func isSystemDark() -> Bool
    func setSystemBars(light: Bool)
    func shareText(_ text: String)
    func shareImage(base64: String, text: String)
    func openExternalURL(_ urlString: String)
    func printPage(name: String)
    func exportFile(name: String, text: String)
    func importFile()
    func openAppSettings(which: String)
}

/// Handles every `window.AndroidBridge` method on iOS, keeping 1:1 parity with Android `MainActivity.java`
/// and Windows `bridge.rs` (verified by `tools/bridge-check.js`).
final class BridgeHandler {
    private weak var host: BridgeHost?
    private let store: Store
    private let scheduler: Scheduler
    let audio: AudioManager
    let location: LocationCompass

    private let syncQueue = DispatchQueue(label: "com.adhkar.app.sync", qos: .utility)

    init(host: BridgeHost, store: Store = .shared, scheduler: Scheduler = .shared) {
        self.host = host
        self.store = store
        self.scheduler = scheduler
        let send: (String) -> Void = { [weak host] code in
            host?.evalJS(code)
        }
        self.audio = AudioManager(store: store, sendJS: send)
        self.location = LocationCompass(sendJS: send)
    }

    /// Synchronous bridge call invoked via `window.prompt('__adhkar__:<fn>', argsJSON)`.
    /// Returns JSON `{"r": <value>}` or `nil` for void.
    func callSync(name: String, argsJSON: String) -> String? {
        let args = parseArgs(argsJSON)
        guard let result = dispatch(name: name, args: args, synchronousSave: true) else {
            return nil
        }
        return encodeResult(result)
    }

    /// Asynchronous fire-and-forget call invoked via `WKScriptMessageHandler`.
    func callAsync(name: String, args: [Any]) {
        _ = dispatch(name: name, args: args, synchronousSave: false)
    }

    func dispatch(name: String, args: [Any], synchronousSave: Bool) -> Any? {
        func str(_ i: Int) -> String {
            guard i < args.count else { return "" }
            return args[i] as? String ?? ""
        }
        func bool(_ i: Int) -> Bool {
            guard i < args.count else { return false }
            if let b = args[i] as? Bool { return b }
            if let n = args[i] as? NSNumber { return n.boolValue }
            return false
        }
        func num(_ i: Int) -> Double {
            guard i < args.count else { return 0 }
            if let d = args[i] as? Double { return d }
            if let n = args[i] as? NSNumber { return n.doubleValue }
            return 0
        }

        switch name {
        // Android-only platform controls: benign no-ops on iOS (UI guarded by window.ADHKAR_IOS)
        case "openOverlay", "openDndAccess", "openBattery", "volumeKeys", "audioHold", "updateCheck", "updateGet":
            return nil
        case "overlayOk", "dndOk", "batteryOk":
            return true
        case "setAlarm", "pinWidget":
            return false
        case "takeNudgeTally":
            return "{}"
        case "updateCan":
            return ""

        // Navigation & lifecycle
        case "setCanBack":
            host?.setCanBack(bool(0))
            return nil
        case "ready":
            host?.onPageReady(ms: num(0))
            return nil
        case "version":
            return (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "ios"
        case "systemDark":
            return host?.isSystemDark() ?? false

        // Durable state mirror
        case "saveState":
            let json = str(0)
            let seq = UInt64(max(0, num(1)))
            store.saveState(json, seq: seq, synchronous: synchronousSave)
            return nil
        case "loadState":
            return store.loadState() ?? NSNull()

        // Device feedback & display
        case "haptic":
            triggerHaptic(str(0))
            return nil
        case "keepAwake":
            let on = bool(0)
            DispatchQueue.main.async {
                UIApplication.shared.isIdleTimerDisabled = on
            }
            return nil
        case "setSystemBars":
            host?.setSystemBars(light: bool(0))
            return nil

        // Sharing, links & printing
        case "shareText":
            host?.shareText(str(0))
            return nil
        case "shareImage":
            host?.shareImage(base64: str(0), text: str(1))
            return nil
        case "openUrl":
            host?.openExternalURL(str(0))
            return nil
        case "printPage":
            host?.printPage(name: str(0))
            return nil

        // Backup export & import
        case "exportFile":
            host?.exportFile(name: str(0), text: str(1))
            return nil
        case "importFile":
            host?.importFile()
            return nil

        // Recited audio downloads & playback
        case "audioHave":
            return audio.have(namesJSON: str(0))
        case "audioUsage":
            return audio.usage()
        case "audioDownload":
            audio.download(listJSON: str(0), tag: str(1))
            return nil
        case "audioCancel":
            audio.cancelDownload()
            return nil
        case "audioDeleteAll":
            audio.deleteAll()
            return nil
        case "audioPlay":
            audio.play(namesJSON: str(0), speed: num(1))
            return nil
        case "audioPause":
            audio.pause()
            return nil
        case "audioResume":
            audio.resume()
            return nil
        case "audioRate":
            audio.setRate(num(0))
            return nil
        case "audioStop":
            audio.stop()
            return nil
        case "previewAdhan":
            return audio.previewAdhan()

        // Reminders & notification events
        case "sync":
            let json = str(0)
            store.saveConfig(json)
            syncQueue.async { [weak self] in
                self?.scheduler.scheduleAll()
            }
            return nil
        case "takeTrackerEvents":
            return store.takeTrackerEvents()
        case "takeWidgetEvents":
            return store.takeWidgetEvents()
        case "requestNotifications":
            return scheduler.requestAuthorization { [weak self] granted in
                self?.host?.evalJS("__native.onPermission&&__native.onPermission('notifications',\(granted ? "true" : "false"))")
            }
        case "notificationState":
            return scheduler.notificationStateJSON(store: store)
        case "testReminder":
            return scheduler.testReminder(title: str(0), body: str(1), store: store)
        case "openSettings":
            host?.openAppSettings(which: str(0))
            return nil

        // Location & Qibla compass
        case "startCompass":
            location.startCompass()
            return nil
        case "stopCompass":
            location.stopCompass()
            return nil
        case "locateQuiet":
            return location.locateQuiet()
        case "requestLocation":
            location.requestLocation()
            return nil

        default:
            return nil
        }
    }

    private func triggerHaptic(_ kind: String) {
        DispatchQueue.main.async {
            switch kind {
            case "success":
                let gen = UINotificationFeedbackGenerator()
                gen.prepare()
                gen.notificationOccurred(.success)
            case "heavy":
                let gen = UIImpactFeedbackGenerator(style: .heavy)
                gen.prepare()
                gen.impactOccurred()
            case "click":
                let gen = UIImpactFeedbackGenerator(style: .medium)
                gen.prepare()
                gen.impactOccurred()
            default:
                let gen = UIImpactFeedbackGenerator(style: .light)
                gen.prepare()
                gen.impactOccurred()
            }
        }
    }

    private func parseArgs(_ json: String) -> [Any] {
        guard let data = json.data(using: .utf8),
              let arr = (try? JSONSerialization.jsonObject(with: data)) as? [Any] else {
            return []
        }
        return arr
    }

    private func encodeResult(_ value: Any) -> String? {
        let wrapper: [String: Any] = ["r": value]
        guard JSONSerialization.isValidJSONObject(wrapper),
              let data = try? JSONSerialization.data(withJSONObject: wrapper) else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }
}
