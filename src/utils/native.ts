import { NativeModules, Platform } from "react-native";

interface WidgetData {
  appId: string;
  appKey: string;
  favorites: string[];
  titles: Record<string, string>;
}

interface AppNativeModule {
  setPortraitLock: (locked: boolean) => void;
  setWidgetData: (data: WidgetData) => void;
  // Android only:
  getWidgets?: () => Promise<{ id: number; page: string }[]>;
  setWidgetPage?: (id: number, page: string) => void;
  requestPinWidget?: () => Promise<boolean>;
}

const AppNative: AppNativeModule | undefined = NativeModules.AppNative;

export const setPortraitLock = (locked: boolean) => {
  AppNative?.setPortraitLock(locked);
};

/** Gives the home-screen widget the API key, favourites and their titles. */
export const setWidgetData = (data: WidgetData) => {
  AppNative?.setWidgetData(data);
};

/** Home-screen widgets and their pages (Android; iOS can't list them). */
export const getWidgets = async () =>
  Platform.OS === "android" && AppNative?.getWidgets
    ? AppNative.getWidgets()
    : [];

export const setWidgetPage = (id: number, page: string) => {
  AppNative?.setWidgetPage?.(id, page);
};

/** Asks the launcher to add the widget (Android 8+); false if it can't. */
export const requestPinWidget = async () =>
  Platform.OS === "android" && AppNative?.requestPinWidget
    ? AppNative.requestPinWidget()
    : false;
