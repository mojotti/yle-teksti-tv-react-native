import AppIntents
import SwiftUI
import WidgetKit

/// Shared with the app (see AppNative.setWidgetData).
enum Shared {
  static let appGroup = "group.com.mojotti.teksti-tv-mobile"
  static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }
  static var appId: String { defaults?.string(forKey: "appId") ?? "" }
  static var appKey: String { defaults?.string(forKey: "appKey") ?? "" }
  static var favorites: [String] { defaults?.stringArray(forKey: "favorites") ?? [] }
  static var titles: [String: String] {
    defaults?.dictionary(forKey: "titles") as? [String: String] ?? [:]
  }
}

// MARK: - Navigation inside the widget

/// Where a widget has been navigated to with its colour keys. Keyed by the
/// configured page; returns to that page after an hour without taps.
enum WidgetNav {
  static let expiry: TimeInterval = 60 * 60

  static func current(configured: String) -> (page: String, sub: Int) {
    guard let v = Shared.defaults?.dictionary(forKey: "nav.\(configured)"),
      let page = v["page"] as? String, let sub = v["sub"] as? Int,
      let at = v["at"] as? Double, Date().timeIntervalSince1970 - at < expiry
    else { return (configured, 1) }
    return (page, sub)
  }

  static func save(configured: String, page: String, sub: Int) {
    Shared.defaults?.set(
      ["page": page, "sub": sub, "at": Date().timeIntervalSince1970], forKey: "nav.\(configured)")
  }
}

struct PageInfo {
  let subCount: Int
  let prev: String?
  let next: String?
}

func fetchPageInfo(_ page: String) async -> PageInfo? {
  guard !Shared.appId.isEmpty,
    let url = URL(string: "https://external.api.yle.fi/v1/teletext/pages/\(page).json?app_id=\(Shared.appId)&app_key=\(Shared.appKey)"),
    let (data, _) = try? await URLSession.shared.data(from: url),
    let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
    let tt = json["teletext"] as? [String: Any],
    let p = tt["page"] as? [String: Any]
  else { return nil }
  return PageInfo(
    subCount: Int(p["subpagecount"] as? String ?? "1") ?? 1,
    prev: p["prevpg"] as? String,
    next: p["nextpg"] as? String)
}

/// The widget's colour keys: previous/next page, previous/next subpage.
struct NavigateIntent: AppIntent {
  static var title: LocalizedStringResource = "Vaihda sivua"
  static var isDiscoverable = false

  @Parameter(title: "Valittu sivu") var configured: String
  @Parameter(title: "Suunta") var action: String

  init() {}
  init(configured: String, action: String) {
    self.configured = configured
    self.action = action
  }

  func perform() async throws -> some IntentResult {
    let (page, sub) = WidgetNav.current(configured: configured)
    guard let info = await fetchPageInfo(page) else { return .result() }
    switch action {
    case "prevPage":
      if let p = info.prev { WidgetNav.save(configured: configured, page: p, sub: 1) }
    case "nextPage":
      if let p = info.next { WidgetNav.save(configured: configured, page: p, sub: 1) }
    case "prevSub":
      WidgetNav.save(configured: configured, page: page, sub: sub > 1 ? sub - 1 : info.subCount)
    default:
      WidgetNav.save(configured: configured, page: page, sub: sub < info.subCount ? sub + 1 : 1)
    }
    return .result()
  }
}

// MARK: - Configuration

struct PageEntity: AppEntity {
  let id: String
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Sivu"
  static var defaultQuery = PageQuery()
  var displayRepresentation: DisplayRepresentation {
    if let title = Shared.titles[id], !title.isEmpty {
      return DisplayRepresentation(title: "\(id)", subtitle: "\(title)")
    }
    return DisplayRepresentation(title: "\(id)")
  }
}

struct PageQuery: EntityStringQuery {
  private func isValid(_ page: String) -> Bool {
    guard page.count == 3, let n = Int(page) else { return false }
    return (100...899).contains(n)
  }

  func entities(for identifiers: [String]) async throws -> [PageEntity] {
    identifiers.filter(isValid).map(PageEntity.init(id:))
  }

  /// Favourites first, then a few common pages.
  func suggestedEntities() async throws -> [PageEntity] {
    var pages = Shared.favorites
    for p in ["100", "101", "201", "400", "160"] where !pages.contains(p) {
      pages.append(p)
    }
    return pages.map(PageEntity.init(id:))
  }

  /// Typing a page number in the picker offers that page.
  func entities(matching string: String) async throws -> [PageEntity] {
    let trimmed = string.trimmingCharacters(in: .whitespaces)
    if isValid(trimmed) { return [PageEntity(id: trimmed)] }
    return try await suggestedEntities().filter { $0.id.hasPrefix(trimmed) }
  }

  func defaultResult() async -> PageEntity? {
    PageEntity(id: Shared.favorites.first ?? "100")
  }
}

struct SelectPageIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Valitse sivu"
  static var description = IntentDescription("Teksti-TV-sivu, joka näytetään pienoisohjelmassa.")

  @Parameter(title: "Sivu")
  var page: PageEntity?
}

// MARK: - Timeline

struct PageEntry: TimelineEntry {
  let date: Date
  let configured: String
  let page: String
  let sub: Int
  let subCount: Int
  let image: UIImage?
}

struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> PageEntry {
    PageEntry(date: .now, configured: "100", page: "100", sub: 1, subCount: 1, image: nil)
  }

  func snapshot(for configuration: SelectPageIntent, in context: Context) async -> PageEntry {
    await entry(for: configuration.page?.id ?? "100")
  }

  func timeline(for configuration: SelectPageIntent, in context: Context) async -> Timeline<PageEntry> {
    let entry = await entry(for: configuration.page?.id ?? "100")
    // iOS decides the final refresh time; ask for roughly every 30 minutes.
    return Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(30 * 60)))
  }

  private func entry(for configured: String) async -> PageEntry {
    let (page, sub) = WidgetNav.current(configured: configured)
    let info = await fetchPageInfo(page)
    let subCount = info?.subCount ?? 1
    let shownSub = min(sub, subCount)
    let base = "https://external.api.yle.fi/v1/teletext/images/\(page)/\(shownSub).png"
    var image: UIImage?
    if !Shared.appId.isEmpty,
      let url = URL(string: "\(base)?app_id=\(Shared.appId)&app_key=\(Shared.appKey)&t=\(Int(Date().timeIntervalSince1970))"),
      let (data, response) = try? await URLSession.shared.data(from: url),
      (response as? HTTPURLResponse)?.statusCode == 200
    {
      image = UIImage(data: data)
    }
    return PageEntry(
      date: .now, configured: configured, page: page, sub: shownSub, subCount: subCount, image: image)
  }
}

// MARK: - View

private let teletextYellow = Color(red: 1, green: 0.886, blue: 0.239)
private let teletextRed = Color(red: 1, green: 0.231, blue: 0.231)
private let teletextGreen = Color(red: 0.184, green: 0.878, blue: 0.416)
private let teletextCyan = Color(red: 0.224, green: 0.890, blue: 1)

/// One colour key; runs NavigateIntent in place without opening the app.
private struct KeyButton: View {
  let color: Color
  let symbol: String
  let intent: NavigateIntent

  var body: some View {
    Button(intent: intent) {
      Image(systemName: symbol)
        .font(.caption.weight(.bold))
        .foregroundStyle(color == teletextRed ? .white : .black)
        .frame(maxWidth: .infinity, minHeight: 22)
        .background(RoundedRectangle(cornerRadius: 5).fill(color))
    }
    .buttonStyle(.plain)
  }
}

struct PageWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: PageEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(alignment: .firstTextBaseline) {
        Text(entry.page).font(.system(.headline, design: .monospaced)).foregroundStyle(teletextYellow)
        if family != .systemSmall, let title = Shared.titles[entry.page], !title.isEmpty {
          Text(title).font(.caption).foregroundStyle(.secondary).lineLimit(1)
        }
        Spacer()
        if entry.subCount > 1 {
          Text("\(entry.sub)/\(entry.subCount)").font(.system(.caption, design: .monospaced))
        }
        Text(entry.date, style: .time).font(.caption2).foregroundStyle(.secondary)
      }
      GeometryReader { geo in
        if let image = entry.image {
          // Small widgets show the top-left corner at a readable size.
          let scale: CGFloat = family == .systemSmall ? 1.8 : 1
          Image(uiImage: image)
            .resizable()
            .interpolation(.none)
            .frame(width: geo.size.width * scale, height: geo.size.width * scale * 0.6)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
            .clipped()
        } else {
          Text(Shared.appId.isEmpty ? "Avaa sovellus kerran" : "Sivua ei saatu")
            .font(.caption)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
      }
      keys
    }
    .containerBackground(.black, for: .widget)
    .widgetURL(URL(string: "tekstitv://page/\(entry.page)/\(entry.sub)"))
  }
}

extension PageWidgetView {
  /// Colour keys along the bottom; the small widget only gets subpages.
  @ViewBuilder var keys: some View {
    let c = entry.configured
    HStack(spacing: 4) {
      if family != .systemSmall {
        KeyButton(color: teletextRed, symbol: "chevron.left", intent: NavigateIntent(configured: c, action: "prevPage"))
        KeyButton(color: teletextGreen, symbol: "chevron.right", intent: NavigateIntent(configured: c, action: "nextPage"))
      }
      if entry.subCount > 1 {
        KeyButton(color: teletextYellow, symbol: "chevron.up", intent: NavigateIntent(configured: c, action: "prevSub"))
        KeyButton(color: teletextCyan, symbol: "chevron.down", intent: NavigateIntent(configured: c, action: "nextSub"))
      }
    }
  }
}

@main
struct TekstiTVWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "TekstiTVPage", intent: SelectPageIntent.self, provider: Provider()) { entry in
      PageWidgetView(entry: entry)
    }
    .configurationDisplayName("Teksti-TV-sivu")
    .description("Näyttää valitsemasi Teksti-TV-sivun.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
