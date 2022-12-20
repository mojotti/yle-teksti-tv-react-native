import { PixelRatio } from "react-native";

const isHighDef = PixelRatio.get() >= 3;

export const pageInfoHeight = isHighDef ? 60 : 55;
export const pageInfoLandscapeWidth = isHighDef ? 80 : 75;
export const linkAreaHeight = isHighDef ? 90 : 80;
export const linkAreaLandscapeWidth = isHighDef ? 100 : 85;

export const fontSizeLarge = isHighDef ? 28 : 26;
export const fontSizeMedium = isHighDef ? 26 : 24;
export const fontSizeSmall = isHighDef ? 24 : 22;

export const iconSizeLarge = isHighDef ? 30 : 28;
export const iconSizeMedium = isHighDef ? 28 : 26;
export const iconSizeSmall = isHighDef ? 26 : 24;

export const portraitNoTouchBarArea = isHighDef ? 28 : 20;
