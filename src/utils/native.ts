import { NativeModules } from "react-native";

interface WidgetData {
  appId: string;
  appKey: string;
  favorites: string[];
  titles: Record<string, string>;
}

interface AppNativeModule {
  setPortraitLock: (locked: boolean) => void;
  setWidgetData: (data: WidgetData) => void;
}

const AppNative: AppNativeModule | undefined = NativeModules.AppNative;

export const setPortraitLock = (locked: boolean) => {
  AppNative?.setPortraitLock(locked);
};

/** Gives the home-screen widget the API key, favourites and their titles. */
export const setWidgetData = (data: WidgetData) => {
  AppNative?.setWidgetData(data);
};
