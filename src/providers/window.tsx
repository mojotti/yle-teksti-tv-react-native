import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useEffect,
} from "react";
import {
  Dimensions,
  ScaledSize,
  StatusBar,
  useWindowDimensions,
} from "react-native";

export enum OrientationTypes {
  Landscape = "landscape",
  Portrait = "portrait",
}

interface WindowType {
  orientation: OrientationTypes;
  deviceScreen: ScaledSize;
  applicationWindow: ScaledSize;
}

export const WindowContext = createContext({} as WindowType);

// Orientation follows the app window, not the device screen: with the
// UIScene life cycle the window can be resized independently of the screen.
export const WindowProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const applicationWindow = useWindowDimensions();

  const orientation =
    applicationWindow.height > applicationWindow.width
      ? OrientationTypes.Portrait
      : OrientationTypes.Landscape;

  useEffect(() => {
    StatusBar.setHidden(orientation === OrientationTypes.Landscape);
  }, [orientation]);

  return (
    <WindowContext.Provider
      value={{
        orientation,
        deviceScreen: Dimensions.get("screen"),
        applicationWindow,
      }}>
      {props.children}
    </WindowContext.Provider>
  );
};
