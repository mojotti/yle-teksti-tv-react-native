import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
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

/** Side the next page slides in from, set by a swipe. */
export type SlideFrom = "left" | "right" | "top" | "bottom";

const SLIDE_MS = 220;

export const PageView: React.FC<{
  width: number;
  height: number;
  dimmed: boolean;
  onLinkPress: (page: string) => void;
  onPress: () => void;
  /**
   * Set by a swipe: when the image next changes, the old page slides out
   * and the new one slides in from this side (as in the favourites view).
   */
  slide?: { from: SlideFrom; at: number };
}> = ({ width, height, dimmed, onLinkPress, onPress, slide }) => {
  const theme = useTheme();
  const { imgSrc } = useContext(PageContext);
  const { setImgLoadingStatus } = useContext(NavigationStatusContext);
  const { settings } = useContext(SettingsContext);
  const inset = pageInset(theme.radius.page);
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;
  const boxes = useLinkBoxes(innerWidth, innerHeight);

  // The page being replaced, kept on screen while the new one slides in.
  const [outgoing, setOutgoing] = useState<{
    src: string;
    from: SlideFrom;
  }>();
  const [shownSrc, setShownSrc] = useState(imgSrc);
  const progress = useRef(new Animated.Value(1)).current;
  const waitingForLoad = useRef(false);
  const usedSlide = useRef<number>(undefined);

  // Decided during render (not in an effect), so the old page never
  // disappears for a frame before the slide starts.
  if (imgSrc !== shownSrc) {
    const previous = shownSrc;
    setShownSrc(imgSrc);
    // Each swipe slides once, and only if the page follows soon after it.
    const recentSwipe =
      slide && slide.at !== usedSlide.current && Date.now() - slide.at < 3000;
    if (previous && imgSrc && recentSwipe) {
      usedSlide.current = slide.at;
      progress.setValue(0);
      waitingForLoad.current = true;
      setOutgoing({ src: previous, from: slide.from });
    } else {
      waitingForLoad.current = false;
      progress.setValue(1);
      setOutgoing(undefined);
    }
  }

  // If the new image never reports loading, slide anyway.
  useEffect(() => {
    if (!outgoing) {
      return;
    }
    const t = setTimeout(() => startSlideRef.current(), 1500);
    return () => clearTimeout(t);
  }, [outgoing]);

  const startSlide = () => {
    if (!waitingForLoad.current) {
      return;
    }
    waitingForLoad.current = false;
    Animated.timing(progress, {
      toValue: 1,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => finished && setOutgoing(undefined));
  };

  const startSlideRef = useRef(startSlide);
  startSlideRef.current = startSlide;

  if (!width || !height) {
    return null;
  }

  // Incoming page: starts one page-width away on the `from` side.
  const from = outgoing?.from;
  const axis =
    from === "top" || from === "bottom" ? "translateY" : "translateX";
  const distance = axis === "translateX" ? innerWidth : innerHeight;
  const sign = from === "left" || from === "top" ? -1 : 1;
  const incomingMove = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sign * distance, 0],
  });
  const outgoingMove = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -sign * distance],
  });
  const crop = cropFrame(innerWidth, innerHeight);

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
          {outgoing && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ [axis]: outgoingMove }] as never },
              ]}
            >
              <Image
                source={{ uri: outgoing.src }}
                resizeMode="stretch"
                fadeDuration={0}
                style={[styles.image, crop]}
              />
            </Animated.View>
          )}
          {imgSrc ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                outgoing && { transform: [{ [axis]: incomingMove }] as never },
              ]}
            >
              <Image
                source={{ uri: imgSrc }}
                resizeMode="stretch"
                // The slide is the transition; no fade on top of it.
                fadeDuration={outgoing ? 0 : undefined}
                onLoadEnd={() => {
                  setImgLoadingStatus(false);
                  startSlide();
                }}
                // Cropped: the image's blank left column and bottom row fall
                // outside the frame (see utils/page-geometry).
                style={[
                  styles.image,
                  crop,
                  { opacity: dimmed && !outgoing ? 0.35 : 1 },
                ]}
              />
            </Animated.View>
          ) : null}
          {settings.pageLinks && !dimmed && !outgoing && (
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
