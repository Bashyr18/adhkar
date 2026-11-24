import Foundation
import WebKit

/// Serves bundled `www/` files under `adhkar-app://app/...` with strict path containment and zero network fallback.
final class WebAssetSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "adhkar-app"
    static let host = "app"
    static let startURL = URL(string: "\(scheme)://\(host)/index.html")!

    private static let mimeTypes: [String: String] = [
        "html": "text/html; charset=utf-8",
        "css": "text/css; charset=utf-8",
        "js": "application/javascript; charset=utf-8",
        "json": "application/json; charset=utf-8",
        "woff2": "font/woff2",
        "svg": "image/svg+xml",
        "png": "image/png",
        "webp": "image/webp",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "caf": "audio/x-caf",
        "ogg": "audio/ogg"
    ]

    private let wwwRoot: URL?
    private var stoppedTasks = Set<ObjectIdentifier>()

    override init() {
        self.wwwRoot = Bundle.main.url(forResource: "www", withExtension: nil)?.standardizedFileURL
        super.init()
    }

    init(wwwRoot: URL?) {
        self.wwwRoot = wwwRoot?.standardizedFileURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let taskId = ObjectIdentifier(urlSchemeTask as AnyObject)
        stoppedTasks.remove(taskId)

        guard let url = urlSchemeTask.request.url,
              url.scheme == Self.scheme,
              url.host == Self.host else {
            finishNotFound(urlSchemeTask, taskId: taskId)
            return
        }

        guard let fileURL = resolvedFileURL(for: url.path),
              let data = try? Data(contentsOf: fileURL) else {
            finishNotFound(urlSchemeTask, taskId: taskId)
            return
        }

        let ext = fileURL.pathExtension.lowercased()
        let contentType = Self.mimeTypes[ext] ?? "application/octet-stream"
        let headers: [String: String] = [
            "Content-Type": contentType,
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff"
        ]

        guard !stoppedTasks.contains(taskId),
              let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers) else {
            return
        }
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        stoppedTasks.insert(ObjectIdentifier(urlSchemeTask as AnyObject))
    }

    func resolvedFileURL(for rawPath: String) -> URL? {
        guard let root = wwwRoot else { return nil }
        let normalized = rawPath.isEmpty || rawPath == "/" ? "/index.html" : rawPath
        let clean = String(normalized.drop(while: { $0 == "/" }))
        if clean.contains("..") || clean.contains("\\") { return nil }

        let candidate = root.appendingPathComponent(clean).standardizedFileURL
        let rootPrefix = root.path.hasSuffix("/") ? root.path : root.path + "/"
        guard candidate.path.hasPrefix(rootPrefix) else { return nil }

        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: candidate.path, isDirectory: &isDir), !isDir.boolValue else {
            return nil
        }
        return candidate
    }

    private func finishNotFound(_ task: WKURLSchemeTask, taskId: ObjectIdentifier) {
        guard !stoppedTasks.contains(taskId) else { return }
        let url = task.request.url ?? Self.startURL
        if let response = HTTPURLResponse(
            url: url,
            statusCode: 404,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "text/plain; charset=utf-8"]
        ) {
            task.didReceive(response)
            task.didReceive(Data())
            task.didFinish()
        }
    }
}
