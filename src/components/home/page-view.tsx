import React, { useContext, useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { PageContext } from "../../providers/page";
import { NavigationStatusContext } from "../../providers/navigation-status";
import { SettingsContext } from "../../providers/settings";
import {
  cropFrame,
  getLinkBoxes,
  LinkBox,
  pageInset,
} from "../../utils/page-geometry";
import { tt, useTheme } from "../../theme/theme";

/** Tap areas for the page numbers on the current subpage. */
const useLinkBoxes = (width: number, height: number): LinkBox[] => {
  const { textTvResponse } = useContext(PageContext);
  const { subPage } = useContext(NavigationStatusContext);
  return useMemo(
    () => getLinkBoxes(textTvResponse, Number(subPage), width, height),
    [textTvResponse, subPage, width, height],
  );
};

export const PageView: React.FC<{
  width: number;
  height: number;
  dimmed: boolean;
  onLinkPress: (page: string) => void;
  onPress: () => void;
}> = ({ width, height, dimmed, onLinkPress, onPress }) => {
  const theme = useTheme();
  const { imgSrc } = useContext(PageContext);
  const { setImgLoadingStatus } = useContext(NavigationStatusContext);
  const { settings } = useContext(SettingsContext);
  const inset = pageInset(theme.radius.page);
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;
  const boxes = useLinkBoxes(innerWidth, innerHeight);

  if (!width || !height) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Teksti-TV-sivu. Napauta avataksesi numeronäppäimistön."
      style={[
        { width, height, borderRadius: theme.radius.page },
        theme.glass && styles.glassShadow,
      ]}
    >
      <View
        style={[
          styles.page,
          {
            width,
            height,
            borderRadius: theme.radius.page,
            borderColor: theme.glass ? "rgba(255,255,255,0.22)" : "transparent",
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            { top: inset, left: inset, width: innerWidth, height: innerHeight },
          ]}
          pointerEvents="box-none"
        >
          {imgSrc ? (
            <Image
              source={{ uri: imgSrc }}
              resizeMode="stretch"
              onLoadEnd={() => setImgLoadingStatus(false)}
              // Cropped: the image's blank left column and bottom row fall
              // outside the frame (see utils/page-geometry).
              style={[
                styles.image,
                cropFrame(innerWidth, innerHeight),
                { opacity: dimmed ? 0.35 : 1 },
              ]}
            />
          ) : null}
          {settings.pageLinks && !dimmed && (
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {boxes.map((b, i) => (
                <Pressable
                  key={`${i}-${b.link}`}
                  onPress={() => onLinkPress(b.link)}
                  accessibilityRole="link"
                  accessibilityLabel={`Sivu ${b.link}`}
                  style={[
                    styles.link,
                    {
                      top: b.top,
                      left: b.left,
                      width: b.width,
                      height: b.height,
                    },
                    settings.highlightScreenLinks && styles.highlight,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  image: {
    position: "absolute",
  },
  inner: {
    position: "absolute",
    overflow: "hidden",
  },
  page: {
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
  },
  glassShadow: {
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  link: {
    position: "absolute",
  },
  highlight: {
    borderWidth: 1.5,
    borderColor: tt.yellow,
    borderRadius: 2,
  },
});
