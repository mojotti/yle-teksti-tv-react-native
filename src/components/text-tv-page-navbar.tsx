import { NavBar } from "./navbar";
import {
  fontSizeMedium,
  iconSizeLarge,
  iconSizeMedium,
  iconSizeSmall,
  pageInfoHeight,
  pageInfoLandscapeWidth,
} from "../utils/constants";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import _IonIcon from "@react-native-vector-icons/ionicons";

import React, {
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { infoAreaColor } from "../utils/colors";
import { SettingsContext } from "../providers/settings";
import { NavigationStatusContext } from "../providers/navigation-status";
import { PageContext } from "../providers/page";
import { OrientationTypes, WindowContext } from "../providers/window";
const Icon = _IonIcon as React.ElementType;

export const TextTvPageNavBar: React.FC<{
  isKeyboardVisible: boolean;
  refreshPage: () => void;
  setKeyboardVisibility: (isVisible: boolean) => void;
  subPageMax: string;
  onBackPress: () => void;
}> = (props) => {
  const { error } = useContext(PageContext);
  const { settings, storeValue } = useContext(SettingsContext);

  const { page, subPage, isLoadingImg, isLoadingPageData } = useContext(
    NavigationStatusContext,
  );

  const { applicationWindow, orientation } = useContext(WindowContext);
  const { width } = applicationWindow;

  const isLoading = isLoadingImg || isLoadingPageData;
  const isLandscape = orientation === OrientationTypes.Landscape;
  const isPageInFavorites = settings.favorites.includes(page);

  // Animation state and refs
  const [displayNumber, setDisplayNumber] = useState(parseInt(page || "100"));
  const targetNumber = useRef(parseInt(page || "100"));
  const animationRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const intervalMs = 30; // Speed while loading

  // Start or update counting animation when page changes
  useEffect(() => {
    if (page) {
      const newTarget = parseInt(page);
      targetNumber.current = newTarget;

      // If not loading, immediately set to target number
      if (!isLoading) {
        setDisplayNumber(newTarget);
        return;
      }

      // Clear any existing animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      // Start counting animation
      animationRef.current = setInterval(() => {
        setDisplayNumber((current) => {
          if (current === targetNumber.current) {
            if (animationRef.current) {
              clearInterval(animationRef.current);
            }
            return targetNumber.current;
          }
          return current + (current < targetNumber.current ? 1 : -1);
        });
      }, intervalMs);
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [page, isLoading]);

  // Immediately jump to target number when loading stops
  useEffect(() => {
    if (!isLoading && displayNumber !== targetNumber.current) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      setDisplayNumber(targetNumber.current);
    }
  }, [isLoading]);

  const addPageToFavorites = () => {
    storeValue("favorites", [...new Set([...settings.favorites, page])].sort());
  };

  const removePageFromFavorites = () => {
    storeValue(
      "favorites",
      [
        ...new Set(settings.favorites.filter((favorite) => favorite !== page)),
      ].sort(),
    );
  };

  return (
    <View
      style={{
        height: isLandscape ? "100%" : pageInfoHeight,
        width: isLandscape ? pageInfoLandscapeWidth : width,
        backgroundColor: "black",
      }}>
      <NavBar
        style={{
          ...styles.pageInfo,
          ...(isLandscape ? styles.pageInfoLandscape : {}),
          height: "100%",
          width: "100%",
        }}>
        <MenuWrapper isLandscape={isLandscape}>
          {page !== "100" && (
            <TouchableOpacity onPress={props.onBackPress}>
              <Icon
                style={{
                  ...styles.menu,
                  paddingRight: isLandscape ? 0 : 10,
                  paddingBottom: isLandscape ? -10 : 0,
                }}
                name={
                  Platform.OS === "ios"
                    ? "chevron-back-outline"
                    : "arrow-back-outline"
                }
                size={iconSizeLarge}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
          {/* {isLoading && !hasUnknownError && (
            <ActivityIndicator size={fontSizeMedium + 8} color="#FFFFFF" />
          )} */}
          <Text
            style={{
              ...styles.pageInfoText,
              fontVariant: ["tabular-nums"],
            }}>
            {displayNumber.toString().padStart(3, "0")}
          </Text>
          {isLandscape && (
            <Text
              style={{ ...styles.pageInfoText, fontVariant: ["tabular-nums"] }}>
              {`${subPage}/${props.subPageMax}`}
            </Text>
          )}

          {(isLandscape || (page && !isLoading)) && (
            <TouchableOpacity
              onPress={() => {
                if (page && !isLoading) {
                  if (isPageInFavorites) {
                    removePageFromFavorites();
                  } else {
                    addPageToFavorites();
                  }
                }
              }}>
              <Icon
                style={{ ...styles.icon, marginRight: isLandscape ? 0 : 15 }}
                name={
                  settings.favoriteIcon === "heart"
                    ? isPageInFavorites
                      ? "heart"
                      : "heart-outline"
                    : isPageInFavorites
                      ? "star"
                      : "star-outline"
                }
                size={iconSizeSmall}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </MenuWrapper>

        <MenuWrapper isLandscape={isLandscape}>
          <TouchableOpacity onPress={props.refreshPage}>
            <Icon
              style={{ ...styles.icon, marginRight: isLandscape ? 0 : 15 }}
              name="refresh-outline"
              size={iconSizeMedium}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              props.setKeyboardVisibility(!props.isKeyboardVisible)
            }>
            <Icon
              style={{ ...styles.icon, marginRight: isLandscape ? 0 : 15 }}
              name="search-outline"
              size={iconSizeMedium}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          {!isLandscape && (
            <Text
              style={{ ...styles.pageInfoText, fontVariant: ["tabular-nums"] }}>
              {`${subPage}/${props.subPageMax}`}
            </Text>
          )}
        </MenuWrapper>
      </NavBar>
    </View>
  );
};

const MenuWrapper: FC<PropsWithChildren<{ isLandscape: boolean }>> = ({
  children,
  isLandscape,
}) => (
  <>
    {isLandscape && <>{children}</>}
    {!isLandscape && <View style={styles.horizontalContainer}>{children}</View>}
  </>
);

const styles = StyleSheet.create({
  pageInfo: {
    backgroundColor: infoAreaColor,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    alignItems: "center",
  },
  pageInfoLandscape: {
    flexDirection: "column",
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  pageInfoText: {
    color: "#FFFFFF",
    fontSize: fontSizeMedium,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
  },
  icon: {
    alignSelf: "center",
    padding: 10,
  },
  menu: {
    alignSelf: "center",
  },
  horizontalContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  verticalContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
});
