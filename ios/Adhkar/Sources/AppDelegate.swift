import BackgroundTasks
import UIKit
import UserNotifications

@main
final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    static let refreshTaskId = "com.adhkar.app.refresh"

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        _ = Store.shared.config() // initialise native language before registering categories
        Scheduler.shared.registerCategories()
        Scheduler.shared.refreshAuthorizationStatus { _ in
            Scheduler.shared.scheduleAll()
        }

        BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.refreshTaskId, using: nil) { task in
            guard let refresh = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }
            self.handleAppRefresh(task: refresh)
        }
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    // MARK: - Background refresh (keeps rolling 60-notification window full)

    static func scheduleBackgroundRefresh() {
        let req = BGAppRefreshTaskRequest(identifier: refreshTaskId)
        req.earliestBeginDate = Date(timeIntervalSinceNow: 12 * 3600)
        try? BGTaskScheduler.shared.submit(req)
    }

    private func handleAppRefresh(task: BGAppRefreshTask) {
        Self.scheduleBackgroundRefresh()
        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }
        Scheduler.shared.scheduleAll {
            task.setTaskCompleted(success: true)
        }
    }

    // MARK: - UNUserNotificationCenterDelegate

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let info = response.notification.request.content.userInfo

        switch response.actionIdentifier {
        case Scheduler.actPrayed:
            if let day = info["day"] as? String, let prayer = info["prayer"] as? String {
                Store.shared.recordPrayed(day: day, prayer: prayer, on: true)
            }
            completionHandler()
            return

        case Scheduler.actSnooze15:
            Scheduler.shared.scheduleSnooze(from: info)
            completionHandler()
            return

        case Scheduler.actAfterPrayer, Scheduler.actOpen:
            if let route = (info["actionRoute"] as? String) ?? (info["route"] as? String) {
                routeToActiveScene(route)
            }
            completionHandler()
            return

        default:
            if let route = info["route"] as? String {
                routeToActiveScene(route)
            }
            completionHandler()
        }
    }

    private func routeToActiveScene(_ route: String) {
        DispatchQueue.main.async {
            for scene in UIApplication.shared.connectedScenes {
                if let delegate = scene.delegate as? SceneDelegate {
                    delegate.openRoute(route)
                    break
                }
            }
        }
    }
}
