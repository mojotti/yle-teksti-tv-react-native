import { useContext } from "react";
import { Platform, TextStyle } from "react-native";
import { SettingsContext } from "../providers/settings";

/** Teletext's colours, slightly tuned for phone screens. */
export const tt = {
  red: "#ff3b3b",
  green: "#2fe06a",
  yellow: "#ffe23d",
  blue: "#2f45ff",
  cyan: "#39e3ff",
  magenta: "#ff4fe6",
  white: "#ffffff",
  black: "#000000",
};

/**
 * - teletext: flat teletext look with colour keys (Teksti-TV)
 * - glass: frosted, rounded, system type (Lasi)
 */
export type ThemeName = "teletext" | "glass";

export const themeLabels: Record<ThemeName, string> = {
  teletext: "Teksti-TV",
  glass: "Lasi",
};

export interface Theme {
  name: ThemeName;
  glass: boolean;
  bg: string;
  chrome: string;
  chromeBorder: string;
  surface: string;
  surfaceBorder: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  sheet: string;
  scrim: string;
  group: string;
  separator: string;
  radius: {
    chip: number;
    pill: number;
    key: number;
    sheet: number;
    page: number;
    group: number;
    fastext: number;
  };
  /** Horizontal margin around the teletext page. */
  pageInset: number;
  /** Text style for page numbers at a given visual size. */
  number: (size: number) => TextStyle;
}

const TELETEXT_FONT = "VT323-Regular";

const teletext: Theme = {
  name: "teletext",
  glass: false,
  bg: "#000000",
  chrome: "#07080a",
  chromeBorder: "#1d2026",
  surface: "#16181d",
  surfaceBorder: "#2c3038",
  text: "#ffffff",
  textMuted: "#8a8f98",
  accent: tt.yellow,
  onAccent: "#000000",
  sheet: "#121418",
  scrim: "rgba(0,0,0,0.6)",
  group: "#14161a",
  separator: "#22252b",
  radius: {
    chip: 7,
    pill: 8,
    key: 9,
    sheet: 18,
    page: 0,
    group: 12,
    fastext: 6,
  },
  pageInset: 0,
  // VT323 renders small for its point size, so it gets the full size.
  number: (size) => ({
    fontFamily: TELETEXT_FONT,
    fontSize: size,
    lineHeight: Math.round(size * 1.05),
    includeFontPadding: false,
  }),
};

const glass: Theme = {
  name: "glass",
  glass: true,
  bg: "#05060a",
  chrome: "rgba(255,255,255,0.09)",
  chromeBorder: "rgba(255,255,255,0.16)",
  surface: "rgba(255,255,255,0.11)",
  surfaceBorder: "rgba(255,255,255,0.12)",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.6)",
  accent: "#ffffff",
  onAccent: "#000000",
  // Opaque: the dock behind would otherwise show through the keys.
  sheet: "#1c1e26",
  scrim: "rgba(0,0,0,0.4)",
  group: "rgba(255,255,255,0.07)",
  separator: "rgba(255,255,255,0.08)",
  radius: {
    chip: 999,
    pill: 15,
    key: 999,
    sheet: 28,
    page: 14,
    group: 16,
    fastext: 14,
  },
  pageInset: 8,
  number: (size) => ({
    fontFamily: Platform.OS === "android" ? "sans-serif-medium" : undefined,
    fontWeight: "600",
    fontSize: Math.round(size * 0.7),
    fontVariant: ["tabular-nums"],
  }),
};

export const themes: Record<ThemeName, Theme> = { teletext, glass };

export const useTheme = (): Theme => {
  const { settings } = useContext(SettingsContext);
  return themes[settings.theme] ?? teletext;
};
