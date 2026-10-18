import UIKit

/// Small native helpers the JS side needs. Exposed to React Native through
/// the legacy module interop (see AppNative.m).
@objc(AppNative)
class AppNative: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

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
