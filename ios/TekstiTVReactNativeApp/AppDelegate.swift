import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    config.delegateClass = SceneDelegate.self
    return config
  }

  func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    OrientationLock.mask
  }
}

// iOS 27 SDK requires the UIScene life cycle, so the window is created here
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    window = UIWindow(windowScene: windowScene)

    // A widget tap launches with a tekstitv:// link; RN reads it as the initial URL.
    let launchOptions = connectionOptions.urlContexts.first.map {
      [UIApplication.LaunchOptionsKey.url: $0.url]
    }

    appDelegate.reactNativeFactory?.startReactNative(
      withModuleName: "TekstiTVReactNativeApp",
      in: window,
      launchOptions: launchOptions
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func createRootViewController() -> UIViewController {
    RootViewController()
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// Status bar style and visibility are view-controller based from iOS 27 on
// (UIApplication's status bar setters are no-ops), so the root controller
// decides: light content, hidden in landscape.
class RootViewController: UIViewController {
  override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

  override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
    OrientationLock.mask
  }

  override var prefersStatusBarHidden: Bool {
    view.bounds.width > view.bounds.height
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    setNeedsStatusBarAppearanceUpdate()
  }
}
