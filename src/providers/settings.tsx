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
import { setPortraitLock } from "../utils/native";

/** Page height relative to width in portrait (landscape always uses TV 4:3). */
export type ScreenRatio = "tv" | "square" | "tall" | "full";
export type FavoriteIcon = "heart" | "star" | "none";
export type SwipeMode = "pagesHorizontal" | "pagesVertical";

export interface Settings {
  favorites: string[];
  favoriteIcon: FavoriteIcon;
  favoritesReplaceLinks: boolean;
  startView: "front" | "favorites";
  theme: ThemeName;
  ambientGlow: boolean;
  screenRatio: ScreenRatio;
  swipe: SwipeMode;
  pageLinks: boolean;
  highlightScreenLinks: boolean;
  showDock: boolean;
  orientationLock: "auto" | "portrait";
  offlineAutoDownload: boolean;
  onboardingDone: boolean;
}

export const MAX_FAVORITES = 20;

export const defaultSettings: Settings = {
  favorites: [],
  favoriteIcon: "heart",
  favoritesReplaceLinks: false,
  startView: "front",
  theme: "teletext",
  ambientGlow: true,
  screenRatio: "tall",
  swipe: "pagesHorizontal",
  pageLinks: true,
  highlightScreenLinks: false,
  showDock: true,
  orientationLock: "auto",
  offlineAutoDownload: false,
  onboardingDone: false,
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

const loadSettings = async (): Promise<Settings> => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (stored) {
    return { ...defaultSettings, ...JSON.parse(stored) };
  }

  const [ratio, highlight, favorites, icon] = await Promise.all(
    LEGACY_KEYS.map((key) => AsyncStorage.getItem(key)),
  );

  const isUpgrade = [ratio, highlight, favorites, icon].some((v) => v !== null);

  return {
    ...defaultSettings,
    // People updating from 2.4 keep the look they know; they can switch.
    theme: isUpgrade ? "classic" : defaultSettings.theme,
    screenRatio: legacyRatio(ratio),
    highlightScreenLinks: highlight === "true",
    favorites: favorites ? favorites.split(",").filter(Boolean) : [],
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
