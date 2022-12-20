import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import { Dimensions, ScaledSize, StatusBar } from "react-native";

const getOrientation = (screen: ScaledSize) => {
  if (screen.height > screen.width) {
    return OrientationTypes.Portrait;
  }

  return OrientationTypes.Landscape;
};

const window = Dimensions.get("window");
const screen = Dimensions.get("screen");

export enum OrientationTypes {
  Landscape = "landscape",
  Portrait = "portrait",
}

interface WindowType {
  orientation: OrientationTypes;
  deviceScreen: ScaledSize;
  applicationWindow: ScaledSize;
}

type DimensionsType = { window: ScaledSize; screen: ScaledSize };

export const WindowContext = createContext({} as WindowType);

export const WindowProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [orientation, setOrientation] = useState<OrientationTypes>(
    getOrientation(screen),
  );

  const [dimensions, setDimensions] = useState<DimensionsType>({
    window,
    screen,
  });

  const onChange = ({ window: w, screen: s }: DimensionsType) => {
    const newOrientation = getOrientation(screen);

    setOrientation(newOrientation);
    setDimensions({ window: w, screen: s });

    StatusBar.setHidden(orientation === OrientationTypes.Landscape);
  };

  useEffect(() => {
    Dimensions.addEventListener("change", onChange);
  });

  return (
    <WindowContext.Provider
      value={{
        orientation,
        deviceScreen: dimensions.screen,
        applicationWindow: dimensions.window,
      }}>
      {props.children}
    </WindowContext.Provider>
  );
};
