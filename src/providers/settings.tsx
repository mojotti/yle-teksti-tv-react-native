import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SettingKey =
  | "screenRatio"
  | "highlightScreenLinks"
  | "favorites"
  | "favoriteIcon";

interface SettingsContext {
  settings: Settings;
  storeValue: (
    key: SettingKey,
    value: boolean | string | string[],
  ) => Promise<void>;
}

interface Settings {
  screenRatio: ScreenRatio;
  highlightScreenLinks: boolean;
  favorites: string[];
  favoriteIcon: FavoriteIcon;
}

export type ScreenRatio =
  | "full"
  | "16:9"
  | "11:8"
  | "4:3"
  | "3:2"
  | "1:1"
  | "goldenRatio";
export type FavoriteIcon = "heart" | "star" | "none";

const defaultSettings: Settings = {
  screenRatio: "4:3",
  highlightScreenLinks: false,
  favorites: [],
  favoriteIcon: "heart",
};

export const SettingsContext = createContext({} as SettingsContext);

export const SettingsProvider: FunctionComponent<PropsWithChildren> = (
  props,
) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    (async () => {
      try {
        const [ratio, highlightLinks, favorites, favoriteIcon] =
          await Promise.all([
            AsyncStorage.getItem("@screenRatio"),
            AsyncStorage.getItem("@highlightScreenLinks"),
            AsyncStorage.getItem("@favorites"),
            AsyncStorage.getItem("@favoriteIcon"),
          ]);

        setSettings({
          screenRatio:
            ratio === null
              ? defaultSettings.screenRatio
              : (ratio as ScreenRatio),
          highlightScreenLinks: highlightLinks === "true",
          favorites: favorites?.split(",") || [],
          favoriteIcon:
            favoriteIcon === null
              ? defaultSettings.favoriteIcon
              : (favoriteIcon as FavoriteIcon),
        });
      } catch (e) {
        console.log("error while reading from local storage");
      }
    })();
  }, []);

  const storeValue = async (
    key: SettingKey,
    value: string | boolean | string[],
  ) => {
    try {
      setSettings((s) => ({ ...s, [key]: value }));

      if (typeof value === "boolean") {
        await AsyncStorage.setItem(`@${key}`, JSON.stringify(value));

        return;
      }

      if (typeof value === "string") {
        await AsyncStorage.setItem(`@${key}`, value);

        return;
      }

      if (Array.isArray(value)) {
        await AsyncStorage.setItem(`@${key}`, value.join(","));
      }
    } catch (e) {
      console.log("error while saving to local storage");
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        storeValue,
      }}>
      {props.children}
    </SettingsContext.Provider>
  );
};
