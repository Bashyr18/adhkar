import UIKit
import UniformTypeIdentifiers
import WebKit

/// Breaks the retain cycle between `WKUserContentController` and `MainViewController`.
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?
    init(delegate: WKScriptMessageHandler) { self.delegate = delegate }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}

/// Hosts the locked-down bundled `WKWebView`, manages safe-area insets, status bar theme,
/// interactive edge-swipe back, native sharing, document export/import, and printing.
final class MainViewController: UIViewController,
    WKNavigationDelegate,
    WKUIDelegate,
    WKScriptMessageHandler,
    UIDocumentPickerDelegate,
    UIGestureRecognizerDelegate,
    BridgeHost
{
    private var webView: WKWebView!
    private var bridge: BridgeHandler!
    private let schemeHandler = WebAssetSchemeHandler()

    private var loaded = false
    private var canBack = false
    private var lightSystemBars = false
    private var pendingRoute: String?
    private var keyboardHeight: CGFloat = 0

    private var exportTempURL: URL?
    private var pickerIsExport = false

    private static let darkBg = UIColor(red: 7.0 / 255.0, green: 8.0 / 255.0, blue: 13.0 / 255.0, alpha: 1.0)
    private static let lightBg = UIColor(red: 245.0 / 255.0, green: 241.0 / 255.0, blue: 233.0 / 255.0, alpha: 1.0)

    override var preferredStatusBarStyle: UIStatusBarStyle {
        lightSystemBars ? .darkContent : .lightContent
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        let initialDark = isSystemDark()
        lightSystemBars = !initialDark
        let bg = initialDark ? Self.darkBg : Self.lightBg
        view.backgroundColor = bg

        bridge = BridgeHandler(host: self)

        let ucc = WKUserContentController()
        ucc.add(WeakScriptMessageHandler(delegate: self), name: "adhkar")

        if let shimURL = Bundle.main.url(forResource: "shim", withExtension: "js"),
           let shimSource = try? String(contentsOf: shimURL, encoding: .utf8) {
            let script = WKUserScript(source: shimSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            ucc.addUserScript(script)
        }

        let config = WKWebViewConfiguration()
        config.userContentController = ucc
        config.setURLSchemeHandler(schemeHandler, forURLScheme: WebAssetSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = .all
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = true
        webView.backgroundColor = bg
        webView.scrollView.backgroundColor = bg
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.allowsBackForwardNavigationGestures = false

        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif

        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        let edgeSwipe = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(handleEdgeSwipe(_:)))
        edgeSwipe.edges = .left
        edgeSwipe.delegate = self
        webView.addGestureRecognizer(edgeSwipe)

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillChange(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide(_:)),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )

        loadInitialPage()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "adhkar")
    }

    private func loadInitialPage() {
        var url = WebAssetSchemeHandler.startURL
        if let route = pendingRoute, let withHash = URL(string: url.absoluteString + route) {
            url = withHash
            pendingRoute = nil
        }
        webView.load(URLRequest(url: url))
    }

    // MARK: - Safe area, keyboard & theme lifecycle

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        pushInsets()
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection), loaded {
            evalJS("A.applyTheme&&A.applyTheme()")
        }
    }

    private func pushInsets() {
        guard loaded else { return }
        let top = Int(round(view.safeAreaInsets.top))
        let bottom = keyboardHeight > 0 ? 0 : Int(round(view.safeAreaInsets.bottom))
        evalJS("__native.onInsets&&__native.onInsets(\(top),\(bottom))")
    }

    @objc private func keyboardWillChange(_ note: Notification) {
        guard let frame = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        let local = view.convert(frame, from: nil)
        let overlap = max(0, view.bounds.maxY - local.minY)
        keyboardHeight = overlap
        webView.scrollView.contentInset.bottom = overlap
        pushInsets()
    }

    @objc private func keyboardWillHide(_ note: Notification) {
        keyboardHeight = 0
        webView.scrollView.contentInset.bottom = 0
        pushInsets()
    }

    // MARK: - App lifecycle hooks (called by SceneDelegate / AppDelegate)

    func handleDeepLinkRoute(_ route: String) {
        if loaded {
            let quoted = AudioManager.jsQuote(route)
            evalJS("__native.onRoute&&__native.onRoute(\(quoted))")
        } else {
            pendingRoute = route
        }
    }

    func onWillEnterForeground() {
        Scheduler.shared.refreshAuthorizationStatus { _ in
            Scheduler.shared.scheduleAll()
        }
        if loaded {
            evalJS("__native.onResume&&__native.onResume()")
        }
    }

    func onDidEnterBackground() {
        bridge.location.stopCompass()
        bridge.audio.stopPreview()
        UIApplication.shared.isIdleTimerDisabled = false
        if loaded {
            evalJS("window.__adhkarFlush&&window.__adhkarFlush()")
        }
    }

    // MARK: - Interactive edge-swipe back

    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        loaded && canBack
    }

    @objc private func handleEdgeSwipe(_ g: UIScreenEdgePanGestureRecognizer) {
        let width = max(1, view.bounds.width)
        let tx = max(0, g.translation(in: view).x)
        let progress = min(1, tx / (width * 0.45))

        switch g.state {
        case .began:
            evalJS("__native.onBackStart&&__native.onBackStart(false)")
        case .changed:
            evalJS(String(format: "__native.onBackProgress&&__native.onBackProgress(%.3f)", locale: Locale(identifier: "en_US_POSIX"), progress))
        case .ended:
            let vx = g.velocity(in: view).x
            if progress > 0.35 || vx > 600 {
                evalJS("__native.onBack&&__native.onBack()")
            } else {
                evalJS("__native.onBackCancel&&__native.onBackCancel()")
            }
        case .cancelled, .failed:
            evalJS("__native.onBackCancel&&__native.onBackCancel()")
        default:
            break
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "adhkar",
              message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == WebAssetSchemeHandler.scheme,
              message.frameInfo.securityOrigin.host == WebAssetSchemeHandler.host,
              let body = message.body as? [String: Any],
              let fn = body["fn"] as? String else {
            return
        }
        let args = (body["args"] as? [Any]) ?? []
        bridge.callAsync(name: fn, args: args)
    }

    // MARK: - WKUIDelegate (synchronous bridge calls & target=_blank external links)

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            openExternalURL(url.absoluteString)
        }
        return nil
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        let prefix = "__adhkar__:"
        guard frame.isMainFrame,
              frame.securityOrigin.protocol == WebAssetSchemeHandler.scheme,
              frame.securityOrigin.host == WebAssetSchemeHandler.host,
              prompt.hasPrefix(prefix) else {
            completionHandler(nil)
            return
        }
        let fn = String(prompt.dropFirst(prefix.count))
        let result = bridge.callSync(name: fn, argsJSON: defaultText ?? "[]")
        completionHandler(result)
    }

    // MARK: - WKNavigationDelegate

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == WebAssetSchemeHandler.scheme && url.host == WebAssetSchemeHandler.host {
            decisionHandler(.allow)
            return
        }
        let sc = (url.scheme ?? "").lowercased()
        if sc == "https" || sc == "http" || sc == "mailto" {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded = true
        pushInsets()
        if let route = pendingRoute {
            pendingRoute = nil
            let quoted = AudioManager.jsQuote(route)
            evalJS("__native.onRoute&&__native.onRoute(\(quoted))")
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loaded = false
        loadInitialPage()
    }

    // MARK: - BridgeHost

    func evalJS(_ code: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript("try{\(code)}catch(e){}", completionHandler: nil)
        }
    }

    func setCanBack(_ can: Bool) {
        DispatchQueue.main.async { [weak self] in
            self?.canBack = can
        }
    }

    func onPageReady(ms: Double) {
        // First paint completed inside WKWebView
        _ = ms
    }

    func isSystemDark() -> Bool {
        traitCollection.userInterfaceStyle == .dark
    }

    func setSystemBars(light: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.lightSystemBars = light
            let bg = light ? Self.lightBg : Self.darkBg
            self.view.backgroundColor = bg
            self.webView.backgroundColor = bg
            self.webView.scrollView.backgroundColor = bg
            self.setNeedsStatusBarAppearanceUpdate()
        }
    }

    func shareText(_ text: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, !text.isEmpty else { return }
            let vc = UIActivityViewController(activityItems: [text], applicationActivities: nil)
            self.presentPopoverSafe(vc)
        }
    }

    func shareImage(base64: String, text: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let data = Data(base64Encoded: base64, options: .ignoreUnknownCharacters),
                  let img = UIImage(data: data) else {
                return
            }
            var items: [Any] = [img]
            if !text.isEmpty { items.append(text) }
            let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
            self.presentPopoverSafe(vc)
        }
    }

    func openExternalURL(_ urlString: String) {
        guard let url = URL(string: urlString),
              let scheme = url.scheme?.lowercased(),
              scheme == "https" || scheme == "http" || scheme == "mailto" else {
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    func printPage(name: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, UIPrintInteractionController.isPrintingAvailable else { return }
            let pc = UIPrintInteractionController.shared
            let info = UIPrintInfo(dictionary: nil)
            info.jobName = name.isEmpty ? "Adhkar" : name
            info.outputType = .general
            pc.printInfo = info
            pc.printFormatter = self.webView.viewPrintFormatter()
            pc.present(animated: true, completionHandler: nil)
        }
    }

    func exportFile(name: String, text: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let rawName = name.isEmpty ? "Adhkar-backup.json" : name
            let safeName = rawName.replacingOccurrences(of: "/", with: "-").replacingOccurrences(of: "\\", with: "-")
            let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(safeName)
            do {
                try Data(text.utf8).write(to: tmp, options: .atomic)
            } catch {
                self.evalJS("__native.onExported&&__native.onExported(false)")
                return
            }
            self.cleanupExportTemp()
            self.exportTempURL = tmp
            self.pickerIsExport = true
            let picker = UIDocumentPickerViewController(forExporting: [tmp], asCopy: true)
            picker.delegate = self
            self.presentPopoverSafe(picker)
        }
    }

    func importFile() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.pickerIsExport = false
            let types: [UTType] = [.json, .plainText, .data]
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
            picker.delegate = self
            picker.allowsMultipleSelection = false
            self.presentPopoverSafe(picker)
        }
    }

    func openAppSettings(which: String) {
        DispatchQueue.main.async {
            let target: String
            if which == "notifications" {
                target = UIApplication.openNotificationSettingsURLString
            } else {
                target = UIApplication.openSettingsURLString
            }
            if let url = URL(string: target) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
    }

    // MARK: - UIDocumentPickerDelegate

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        if pickerIsExport {
            cleanupExportTemp()
            evalJS("__native.onExported&&__native.onExported(true)")
            return
        }
        guard let url = urls.first else { return }
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let accessed = url.startAccessingSecurityScopedResource()
            defer {
                if accessed { url.stopAccessingSecurityScopedResource() }
            }
            guard let data = try? Data(contentsOf: url),
                  data.count <= 20_000_000,
                  let text = String(data: data, encoding: .utf8) else {
                return
            }
            let quoted = AudioManager.jsQuote(text)
            self?.evalJS("__native.onImport&&__native.onImport(\(quoted))")
        }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        if pickerIsExport {
            cleanupExportTemp()
            evalJS("__native.onExported&&__native.onExported(false)")
        }
    }

    private func cleanupExportTemp() {
        if let u = exportTempURL {
            try? FileManager.default.removeItem(at: u)
            exportTempURL = nil
        }
    }

    private func presentPopoverSafe(_ vc: UIViewController) {
        if let pop = vc.popoverPresentationController {
            pop.sourceView = view
            pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            pop.permittedArrowDirections = []
        }
        present(vc, animated: true)
    }
}
