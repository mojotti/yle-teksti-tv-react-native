import UIKit
import WidgetKit

/// Small native helpers the JS side needs. Exposed to React Native through
/// the legacy module interop (see AppNative.m).
@objc(AppNative)
class AppNative: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  /// Shares what the home-screen widget needs (API credentials, favourites,
  /// page titles) through the App Group, then refreshes the widgets.
  @objc func setWidgetData(_ data: NSDictionary) {
    guard let defaults = UserDefaults(suiteName: "group.com.mojotti.teksti-tv-mobile") else { return }
    defaults.set(data["appId"] as? String, forKey: "appId")
    defaults.set(data["appKey"] as? String, forKey: "appKey")
    defaults.set(data["favorites"] as? [String] ?? [], forKey: "favorites")
    defaults.set(data["titles"] as? [String: String] ?? [:], forKey: "titles")
    WidgetCenter.shared.reloadAllTimelines()
  }

  /// Locks the app to portrait, or allows all orientations again.
  @objc func setPortraitLock(_ locked: Bool) {
    DispatchQueue.main.async {
      OrientationLock.portraitOnly = locked
      for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
        if #available(iOS 16.0, *) {
          scene.keyWindow?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
          if locked {
            scene.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait)) { _ in }
          }
        } else if locked {
          UIDevice.current.setValue(UIInterfaceOrientation.portrait.rawValue, forKey: "orientation")
          UIViewController.attemptRotationToDeviceOrientation()
        }
      }
    }
  }
}

enum OrientationLock {
  static var portraitOnly = false

  static var mask: UIInterfaceOrientationMask {
    portraitOnly ? .portrait : .allButUpsideDown
  }
}
