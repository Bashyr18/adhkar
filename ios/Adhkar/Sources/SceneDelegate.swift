import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var rootController: MainViewController?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        let vc = MainViewController()
        self.rootController = vc
        window.rootViewController = vc
        self.window = window
        window.makeKeyAndVisible()

        if let url = connectionOptions.urlContexts.first?.url, let route = Self.route(from: url) {
            vc.handleDeepLinkRoute(route)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url, let route = Self.route(from: url) else { return }
        rootController?.handleDeepLinkRoute(route)
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        rootController?.onWillEnterForeground()
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        rootController?.onDidEnterBackground()
        AppDelegate.scheduleBackgroundRefresh()
    }

    func openRoute(_ route: String) {
        rootController?.handleDeepLinkRoute(route)
    }

    /// Converts `adhkar://route/salah` → `#/salah`.
    static func route(from url: URL) -> String? {
        guard url.scheme?.lowercased() == "adhkar",
              url.host?.lowercased() == "route" else {
            return nil
        }
        let cleaned = String(url.path.drop(while: { $0 == "/" }))
        return "#/" + cleaned
    }
}
