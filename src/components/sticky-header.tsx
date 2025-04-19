import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  ViewStyle,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { infoAreaColor } from "../utils/colors";

interface StickyHeaderProps {
  headerContent: React.ReactNode;
  style?: ViewStyle;
  scrollY: Animated.Value;
  headerHeight?: number;
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  headerContent,
  style,
  scrollY,
  headerHeight = 60,
}) => {
  const translateY = useRef(
    scrollY.interpolate({
      inputRange: [0, headerHeight],
      outputRange: [0, -headerHeight],
      extrapolate: "clamp",
    }),
  ).current;

  const opacity = useRef(
    scrollY.interpolate({
      inputRange: [0, headerHeight / 2, headerHeight],
      outputRange: [1, 0.5, 0],
      extrapolate: "clamp",
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: headerHeight,
          transform: [{ translateY }],
        },
        style,
      ]}>
      <Animated.View style={[styles.content, { opacity }]}>
        {headerContent}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: infoAreaColor,
    zIndex: 100,
    elevation: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
