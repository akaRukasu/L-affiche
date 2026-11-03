import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CatalogueTabController()
        window?.overrideUserInterfaceStyle = .dark
        window?.tintColor = .systemBlue
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// UIKit owns the navigation and tab bars. All sections share one WKWebView.
final class CatalogueTabController: UITabBarController {
    private let catalogue = CatalogueBridgeController()

    override func viewDidLoad() {
        super.viewDidLoad()
        let sections: [(String, String, String, String)] = [
            ("live", "En direct", "En direct", "play.tv"),
            ("soon", "Bientôt", "Bientôt", "clock"),
            ("explore", "Explorer", "Explorer", "magnifyingglass"),
            ("saved", "Ma sélection", "Sélection", "heart")
        ]
        viewControllers = sections.enumerated().map { index, item in
            let host = CatalogueHostController(catalogue: catalogue, section: item.0, title: item.1)
            let navigation = UINavigationController(rootViewController: host)
            navigation.navigationBar.prefersLargeTitles = true
            navigation.tabBarItem = UITabBarItem(title: item.2, image: UIImage(systemName: item.3), tag: index)
            return navigation
        }
    }
}

final class CatalogueHostController: UIViewController, UISearchResultsUpdating {
    private let catalogue: CatalogueBridgeController
    private let section: String
    private let search = UISearchController(searchResultsController: nil)

    init(catalogue: CatalogueBridgeController, section: String, title: String) {
        self.catalogue = catalogue
        self.section = section
        super.init(nibName: nil, bundle: nil)
        self.title = title
    }

    required init?(coder: NSCoder) { fatalError("Use init(catalogue:section:title:)") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        search.searchResultsUpdater = self
        search.obscuresBackgroundDuringPresentation = false
        search.searchBar.placeholder = "Titre, chaîne, genre"
        navigationItem.searchController = search
        navigationItem.hidesSearchBarWhenScrolling = false
        definesPresentationContext = true
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if catalogue.parent !== self {
            if catalogue.parent != nil {
                catalogue.willMove(toParent: nil)
                catalogue.view.removeFromSuperview()
                catalogue.removeFromParent()
            }
            addChild(catalogue)
            let content = catalogue.view!
            content.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(content)
            NSLayoutConstraint.activate([
                content.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
                content.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
                content.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
                content.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
            ])
            catalogue.didMove(toParent: self)
        }
        catalogue.activate(section: section, query: search.searchBar.text ?? "")
    }

    func updateSearchResults(for searchController: UISearchController) {
        guard catalogue.parent === self else { return }
        catalogue.search(searchController.searchBar.text ?? "")
    }
}

private final class ReadyMessageHandler: NSObject, WKScriptMessageHandler {
    weak var owner: CatalogueBridgeController?
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.protocol == "capacitor", message.frameInfo.securityOrigin.host == "localhost" else { return }
        owner?.pageReady()
    }
}

final class CatalogueBridgeController: CAPBridgeViewController {
    private var section = "live"
    private var query = ""
    private var ready = false

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        let handler = ReadyMessageHandler()
        handler.owner = self
        webView?.configuration.userContentController.add(handler, name: "alafficheReady")
        let source = """
        (() => {
          const notify = () => window.webkit.messageHandlers.alafficheReady.postMessage('ready');
          window.addEventListener('alaffiche:ready', notify);
          if (window.ALAfficheNative) notify();
        })();
        """
        webView?.configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.isOpaque = false
        webView?.backgroundColor = .black
        NotificationCenter.default.addObserver(self, selector: #selector(textSizeChanged), name: UIContentSizeCategory.didChangeNotification, object: nil)
    }

    func pageReady() { ready = true; sendState() }
    func activate(section: String, query: String) { self.section = section; self.query = query; sendState() }
    func search(_ query: String) { self.query = query; sendQuery() }
    @objc private func textSizeChanged() { sendQuery() }

    private func arguments() -> String? {
        let size = UIFont.preferredFont(forTextStyle: .body).pointSize
        guard let data = try? JSONSerialization.data(withJSONObject: [section, query, size]) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func sendState() {
        guard ready, let args = arguments() else { return }
        webView?.evaluateJavaScript("(() => { const [tab, query, size] = \(args); window.ALAfficheNative?.selectTab(tab); window.ALAfficheNative?.search(query); window.ALAfficheNative?.setTextScale(size); })();", completionHandler: nil)
    }

    private func sendQuery() {
        guard ready, let args = arguments() else { return }
        webView?.evaluateJavaScript("(() => { const [, query, size] = \(args); window.ALAfficheNative?.search(query); window.ALAfficheNative?.setTextScale(size); })();", completionHandler: nil)
    }
}
