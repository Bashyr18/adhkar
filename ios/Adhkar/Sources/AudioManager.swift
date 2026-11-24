import AVFoundation
import Foundation

/// Optional recited audio: downloads strictly from the two allowlisted recitation hosts (or copies bundled audio),
/// plays playlists via AVAudioPlayer with adjustable speed, and previews the Madinah adhān takbīr.
final class AudioManager: NSObject, AVAudioPlayerDelegate, URLSessionTaskDelegate {
    static let allowedHosts = [
        "https://www.hisnmuslim.com/audio/ar/",
        "https://everyayah.com/data/Alafasy_128kbps/"
    ]
    static let maxBytes: Int64 = 12 * 1024 * 1024

    private let store: Store
    private let sendJS: (String) -> Void
    private let downloadQueue = DispatchQueue(label: "com.adhkar.app.audio.dl", qos: .utility)
    private let cancelLock = NSLock()
    private var cancelled = false

    private var player: AVAudioPlayer?
    private var queue: [URL] = []
    private var qi = 0
    private var rate: Float = 1.0
    private var progressTimer: Timer?

    private var previewPlayer: AVAudioPlayer?
    private lazy var session: URLSession = {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.timeoutIntervalForRequest = 15
        cfg.timeoutIntervalForResource = 30
        cfg.waitsForConnectivity = false
        return URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
    }()

    init(store: Store = .shared, sendJS: @escaping (String) -> Void) {
        self.store = store
        self.sendJS = sendJS
        super.init()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func handleAudioInterruption(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else {
            return
        }
        if type == .began {
            DispatchQueue.main.async { [weak self] in
                self?.player?.pause()
                self?.stopPreview()
            }
        }
    }

    // MARK: - Allowlist validation

    static func safeName(_ name: String) -> Bool {
        guard name.count >= 5 && name.count <= 28 && name.hasSuffix(".mp3") else { return false }
        let stem = name.dropLast(4)
        guard !stem.isEmpty && stem.count <= 24 else { return false }
        return stem.allSatisfy { ($0 >= "a" && $0 <= "z") || ($0 >= "0" && $0 <= "9") }
    }

    static func allowedURL(_ urlStr: String) -> Bool {
        for host in allowedHosts {
            if urlStr.hasPrefix(host) {
                let tail = String(urlStr.dropFirst(host.count))
                guard tail.hasSuffix(".mp3") else { return false }
                let digits = tail.dropLast(4)
                return !digits.isEmpty && digits.count <= 6 && digits.allSatisfy { $0 >= "0" && $0 <= "9" }
            }
        }
        return false
    }

    static func allowedAssetPath(_ path: String) -> Bool {
        guard path.hasPrefix("audio/") && path.hasSuffix(".mp3") else { return false }
        let stem = path.dropFirst(6).dropLast(4)
        guard !stem.isEmpty && stem.count <= 40 else { return false }
        return stem.allSatisfy { ($0 >= "a" && $0 <= "z") || ($0 >= "0" && $0 <= "9") || $0 == "-" }
    }

    // MARK: - Storage queries

    func have(namesJSON: String) -> String {
        guard let data = namesJSON.data(using: .utf8),
              let names = (try? JSONSerialization.jsonObject(with: data)) as? [String] else {
            return "[]"
        }
        let dir = store.audioDir
        let existing = names.filter { Self.safeName($0) && FileManager.default.fileExists(atPath: dir.appendingPathComponent($0).path) }
        guard let out = try? JSONSerialization.data(withJSONObject: existing),
              let str = String(data: out, encoding: .utf8) else {
            return "[]"
        }
        return str
    }

    func usage() -> Int64 {
        let dir = store.audioDir
        guard let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        return files.reduce(Int64(0)) { sum, url in
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            return sum + Int64(size)
        }
    }

    func deleteAll() {
        stop()
        let dir = store.audioDir
        guard let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { return }
        for f in files {
            try? FileManager.default.removeItem(at: f)
        }
    }

    func cancelDownload() {
        cancelLock.withLock { cancelled = true }
    }

    private func isCancelled() -> Bool {
        cancelLock.withLock { cancelled }
    }

    // MARK: - Downloads

    func download(listJSON: String, tag: String) {
        cancelLock.withLock { cancelled = false }
        downloadQueue.async { [weak self] in
            guard let self = self else { return }
            guard let data = listJSON.data(using: .utf8),
                  let items = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] else {
                self.report(tag: tag, state: "error", done: 0, total: 0)
                return
            }
            let total = items.count
            var done = 0
            var failed = 0
            var state = "done"
            let dir = self.store.audioDir

            for item in items {
                if self.isCancelled() {
                    state = "cancelled"
                    break
                }
                let n = (item["n"] as? String) ?? ""
                let u = (item["u"] as? String) ?? ""
                let dst = dir.appendingPathComponent(n)
                var ok = false
                for _ in 0..<2 where !ok && !self.isCancelled() {
                    if u.hasPrefix("asset:") {
                        let rel = String(u.dropFirst(6))
                        guard Self.safeName(n), Self.allowedAssetPath(rel) else { break }
                        if FileManager.default.fileExists(atPath: dst.path) {
                            ok = true
                        } else {
                            ok = self.copyBundledAsset(relPath: rel, to: dst)
                        }
                    } else {
                        guard Self.safeName(n), Self.allowedURL(u) else { break }
                        if FileManager.default.fileExists(atPath: dst.path) {
                            ok = true
                        } else {
                            ok = self.fetchRemote(urlStr: u, to: dst)
                        }
                    }
                }
                if ok { done += 1 } else { failed += 1 }
                self.report(tag: tag, state: "progress", done: done + failed, total: total)
            }

            if state == "done" && failed > 0 {
                state = done > 0 ? "partial" : "error"
            }
            self.report(tag: tag, state: state, done: done, total: total)
        }
    }

    private func copyBundledAsset(relPath: String, to dst: URL) -> Bool {
        guard let www = Bundle.main.url(forResource: "www", withExtension: nil) else { return false }
        let src = www.appendingPathComponent(relPath)
        let tmp = dst.appendingPathExtension("part")
        do {
            try? FileManager.default.removeItem(at: tmp)
            try FileManager.default.copyItem(at: src, to: tmp)
            if FileManager.default.fileExists(atPath: dst.path) {
                _ = try FileManager.default.replaceItemAt(dst, withItemAt: tmp)
            } else {
                try FileManager.default.moveItem(at: tmp, to: dst)
            }
            return true
        } catch {
            try? FileManager.default.removeItem(at: tmp)
            return false
        }
    }

    private func fetchRemote(urlStr: String, to dst: URL) -> Bool {
        guard let url = URL(string: urlStr) else { return false }
        let sem = DispatchSemaphore(value: 0)
        var success = false
        let tmp = dst.appendingPathExtension("part")

        let task = session.dataTask(with: url) { [weak self] data, response, error in
            defer { sem.signal() }
            guard let self = self, !self.isCancelled(), error == nil,
                  let http = response as? HTTPURLResponse, http.statusCode == 200,
                  let data = data, Int64(data.count) <= Self.maxBytes else {
                return
            }
            if let ct = http.value(forHTTPHeaderField: "Content-Type")?.lowercased(),
               !ct.hasPrefix("audio/") && !ct.hasPrefix("application/octet-stream") {
                return
            }
            do {
                try data.write(to: tmp, options: .atomic)
                if FileManager.default.fileExists(atPath: dst.path) {
                    _ = try FileManager.default.replaceItemAt(dst, withItemAt: tmp)
                } else {
                    try FileManager.default.moveItem(at: tmp, to: dst)
                }
                success = true
            } catch {
                try? FileManager.default.removeItem(at: tmp)
            }
        }
        task.resume()
        _ = sem.wait(timeout: .now() + 30)
        return success
    }

    // Refuse HTTP redirects so downloads never leave the two allowlisted hosts.
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }

    private func report(tag: String, state: String, done: Int, total: Int) {
        let obj: [String: Any] = ["tag": tag, "state": state, "done": done, "total": total]
        guard let data = try? JSONSerialization.data(withJSONObject: obj),
              let str = String(data: data, encoding: .utf8) else { return }
        let quoted = Self.jsQuote(str)
        sendJS("__native.onAudio&&__native.onAudio(\(quoted))")
    }

    // MARK: - Playback

    func play(namesJSON: String, speed: Double) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.stopInternal()
            self.stopPreview()
            guard let data = namesJSON.data(using: .utf8),
                  let names = (try? JSONSerialization.jsonObject(with: data)) as? [String] else {
                return
            }
            let dir = self.store.audioDir
            self.queue = names.compactMap { n in
                guard Self.safeName(n) else { return nil }
                let u = dir.appendingPathComponent(n)
                return FileManager.default.fileExists(atPath: u.path) ? u : nil
            }
            guard !self.queue.isEmpty else { return }
            self.rate = Float(max(0.5, min(1.5, speed)))
            self.qi = 0
            self.startCurrent()
        }
    }

    private func configureAudioSession() {
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .spokenAudio, options: [])
        try? s.setActive(true)
    }

    private func startCurrent() {
        guard qi < queue.count else {
            stopInternal()
            sendJS("__native.onAudioEnd&&__native.onAudioEnd()")
            return
        }
        configureAudioSession()
        do {
            let p = try AVAudioPlayer(contentsOf: queue[qi])
            p.delegate = self
            p.enableRate = true
            p.rate = rate
            p.prepareToPlay()
            p.play()
            player = p
            startTimer()
        } catch {
            stopInternal()
            sendJS("__native.onAudioEnd&&__native.onAudioEnd()")
        }
    }

    private func startTimer() {
        progressTimer?.invalidate()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            guard let self = self, let p = self.player else { return }
            let pos = Int(p.currentTime * 1000.0)
            let dur = Int(p.duration * 1000.0)
            let playing = p.isPlaying ? "true" : "false"
            self.sendJS("__native.onAudioPos&&__native.onAudioPos(\(self.qi),\(self.queue.count),\(pos),\(dur),\(playing))")
        }
    }

    func pause() {
        DispatchQueue.main.async { [weak self] in
            self?.player?.pause()
        }
    }

    func resume() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let p = self.player, !p.isPlaying else { return }
            self.configureAudioSession()
            p.rate = self.rate
            p.play()
            self.startTimer()
        }
    }

    func setRate(_ r: Double) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.rate = Float(max(0.5, min(1.5, r)))
            if let p = self.player {
                let wasPlaying = p.isPlaying
                p.rate = self.rate
                if !wasPlaying { p.pause() }
            }
        }
    }

    func stop() {
        DispatchQueue.main.async { [weak self] in
            self?.stopInternal()
        }
    }

    private func stopInternal() {
        progressTimer?.invalidate()
        progressTimer = nil
        player?.stop()
        player?.delegate = nil
        player = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: - Adhān preview

    func previewAdhan() -> Bool {
        if previewPlayer != nil {
            stopPreview()
            return false
        }
        guard let url = Bundle.main.url(forResource: "adhan_takbir", withExtension: "caf")
            ?? Bundle.main.url(forResource: "adhan_takbir", withExtension: "wav") else {
            return false
        }
        configureAudioSession()
        do {
            let p = try AVAudioPlayer(contentsOf: url)
            p.delegate = self
            p.prepareToPlay()
            p.play()
            previewPlayer = p
            return true
        } catch {
            stopPreview()
            return false
        }
    }

    func stopPreview() {
        previewPlayer?.stop()
        previewPlayer?.delegate = nil
        previewPlayer = nil
    }

    // MARK: - AVAudioPlayerDelegate

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        if player === previewPlayer {
            stopPreview()
            sendJS("__native.onAdhanEnd&&__native.onAdhanEnd()")
            return
        }
        if player === self.player {
            self.player = nil
            qi += 1
            if qi < queue.count {
                startCurrent()
            } else {
                stopInternal()
                sendJS("__native.onAudioEnd&&__native.onAudioEnd()")
            }
        }
    }

    static func jsQuote(_ s: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: [s]),
              let arr = String(data: data, encoding: .utf8),
              arr.count >= 2 else {
            return "\"\""
        }
        return String(arr.dropFirst().dropLast())
    }
}
