import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeName } from "../theme/theme";

const themeNames: ThemeName[] = ["teletext", "glass"];
import { setPortraitLock } from "../utils/native";

/** Page height relative to width in portrait (landscape always uses TV 4:3). */
export type ScreenRatio = "tv" | "square" | "tall" | "full";
export type FavoriteIcon = "heart" | "star" | "none";
export type SwipeMode = "pagesHorizontal" | "pagesVertical";
/** What the bottom bar (dock) lists. */
export type DockContent = "favorites" | "links" | "both";

export interface Settings {
  favorites: string[];
  favoriteIcon: FavoriteIcon;
  dockContent: DockContent;
  startView: "front" | "favorites";
  theme: ThemeName;
  ambientGlow: boolean;
  screenRatio: ScreenRatio;
  swipe: SwipeMode;
  pageLinks: boolean;
  highlightScreenLinks: boolean;
  showDock: boolean;
  /** Portrait only; landscape always shows subpages in the side rail. */
  showSubpageRow: boolean;
  orientationLock: "auto" | "portrait";
  offlineAutoDownload: boolean;
  onboardingDone: boolean;
  /** Bumped when defaults change for existing users (see migrate). */
  version: number;
}

export const MAX_FAVORITES = 20;

export const defaultSettings: Settings = {
  favorites: [],
  favoriteIcon: "heart",
  dockContent: "both",
  startView: "front",
  theme: "glass",
  ambientGlow: true,
  screenRatio: "tall",
  swipe: "pagesHorizontal",
  pageLinks: false,
  highlightScreenLinks: false,
  showDock: true,
  showSubpageRow: false,
  orientationLock: "auto",
  offlineAutoDownload: false,
  onboardingDone: false,
  version: 2,
};

/**
 * Brings stored settings up to date. Version 2: page-number links and the
 * subpage row are off by default; "favoritesReplaceLinks" became
 * dockContent.
 */
export const migrate = (stored: Record<string, unknown>): Settings => {
  const s = { ...defaultSettings, ...stored } as Settings & {
    favoritesReplaceLinks?: boolean;
  };
  if (!stored.version || (stored.version as number) < 2) {
    s.pageLinks = false;
    s.showSubpageRow = false;
    s.dockContent = s.favoritesReplaceLinks ? "favorites" : "both";
    s.version = 2;
  }
  delete s.favoritesReplaceLinks;
  return s;
};

interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
}

export const SettingsContext = createContext({
  settings: defaultSettings,
  loaded: false,
  update: () => {},
} as SettingsContextValue);

const STORAGE_KEY = "@settings";

// Settings were stored one key per value before 2.5.
const LEGACY_KEYS = [
  "@screenRatio",
  "@highlightScreenLinks",
  "@favorites",
  "@favoriteIcon",
];

const legacyRatio = (ratio: string | null): ScreenRatio => {
  switch (ratio) {
    case "full":
    case "16:9":
      return "full";
    case "1:1":
      return "square";
    default:
      // "4:3" (the old default), "3:2", "11:8" and the golden ratio were
      // all portrait shapes close to the new "tall" preset.
      return "tall";
  }
};

export const loadSettings = async (): Promise<Settings> => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (stored) {
    const parsed = migrate(JSON.parse(stored));
    // Themes that no longer exist ("classic") fall back to the default.
    if (!themeNames.includes(parsed.theme)) {
      parsed.theme = defaultSettings.theme;
    }
    return parsed;
  }

  const [ratio, highlight, favorites, icon] = await Promise.all(
    LEGACY_KEYS.map((key) => AsyncStorage.getItem(key)),
  );

  return {
    ...defaultSettings,
    screenRatio: legacyRatio(ratio),
    highlightScreenLinks: highlight === "true",
    favorites: favorites ? favorites.split(",").filter(Boolean).sort() : [],
    favoriteIcon: (icon as FavoriteIcon | null) ?? defaultSettings.favoriteIcon,
  };
};

export const SettingsProvider: FunctionComponent<PropsWithChildren> = (
  props,
) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(settings);

  useEffect(() => {
    loadSettings()
      .then((s) => {
        latest.current = s;
        setSettings(s);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      setPortraitLock(settings.orientationLock === "portrait");
    }
  }, [loaded, settings.orientationLock]);

  const update = useCallback((patch: Partial<Settings>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loaded, update }}>
      {props.children}
    </SettingsContext.Provider>
  );
};
