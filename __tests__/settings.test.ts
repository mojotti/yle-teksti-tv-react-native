import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultSettings, loadSettings } from "../src/providers/settings";

beforeEach(() => AsyncStorage.clear());

describe("loadSettings", () => {
  it("gives new users the defaults, with the Lasi theme", async () => {
    const s = await loadSettings();
    expect(s).toEqual(defaultSettings);
    expect(s.theme).toBe("glass");
    expect(s.showSubpageRow).toBe(false);
    expect(s.pageLinks).toBe(false);
    expect(s.dockContent).toBe("both");
  });

  it("moves settings saved before version 2 to the new defaults", async () => {
    await AsyncStorage.setItem(
      "@settings",
      JSON.stringify({
        pageLinks: true,
        showSubpageRow: true,
        favoritesReplaceLinks: true,
        favorites: ["100"],
      }),
    );
    const s = await loadSettings();
    expect(s.pageLinks).toBe(false);
    expect(s.showSubpageRow).toBe(false);
    expect(s.dockContent).toBe("favorites");
    expect(s.version).toBe(2);
    expect("favoritesReplaceLinks" in s).toBe(false);
  });

  it("keeps choices made after version 2", async () => {
    await AsyncStorage.setItem(
      "@settings",
      JSON.stringify({ version: 2, pageLinks: true, showSubpageRow: true }),
    );
    const s = await loadSettings();
    expect(s.pageLinks).toBe(true);
    expect(s.showSubpageRow).toBe(true);
  });

  it("migrates 2.4 settings, sorting favourites by number", async () => {
    await AsyncStorage.multiSet([
      ["@favorites", "235,100,134"],
      ["@screenRatio", "4:3"],
      ["@highlightScreenLinks", "true"],
      ["@favoriteIcon", "star"],
    ]);
    const s = await loadSettings();
    expect(s.favorites).toEqual(["100", "134", "235"]);
    expect(s.screenRatio).toBe("tall");
    expect(s.highlightScreenLinks).toBe(true);
    expect(s.favoriteIcon).toBe("star");
  });

  it.each([
    ["full", "full"],
    ["16:9", "full"],
    ["1:1", "square"],
    ["3:2", "tall"],
    ["goldenRatio", "tall"],
  ])("maps the old %s ratio to %s", async (old, preset) => {
    await AsyncStorage.setItem("@screenRatio", old);
    expect((await loadSettings()).screenRatio).toBe(preset);
  });

  it("falls back when a stored theme no longer exists", async () => {
    await AsyncStorage.setItem(
      "@settings",
      JSON.stringify({ theme: "classic", favorites: ["100"] }),
    );
    const s = await loadSettings();
    expect(s.theme).toBe(defaultSettings.theme);
    expect(s.favorites).toEqual(["100"]);
  });

  it("fills in settings added after the stored copy was saved", async () => {
    await AsyncStorage.setItem(
      "@settings",
      JSON.stringify({ theme: "teletext" }),
    );
    const s = await loadSettings();
    expect(s.theme).toBe("teletext");
    expect(s.dockContent).toBe("both");
    expect(s.offlineAutoDownload).toBe(false);
  });
});
