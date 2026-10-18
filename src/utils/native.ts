import { NativeModules } from "react-native";

interface AppNativeModule {
  setPortraitLock: (locked: boolean) => void;
}

const AppNative: AppNativeModule | undefined = NativeModules.AppNative;

export const setPortraitLock = (locked: boolean) => {
  AppNative?.setPortraitLock(locked);
};
