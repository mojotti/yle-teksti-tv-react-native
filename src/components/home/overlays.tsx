import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { tt, useTheme } from "../../theme/theme";
import { Icon } from "../ui";
import { formatClock } from "../../utils/offline";

/** True once `active` has stayed true for `ms`, so quick loads don't flash. */
export const useDelayed = (active: boolean, ms = 250) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!active) {
      setOn(false);
      return;
    }
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return on;
};

/** Thin cyan bar sweeping under the header while a page loads. */
export const ProgressLine: React.FC<{ active: boolean }> = ({ active }) => {
  const x = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    x.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [active, x]);

  return (
    <View
      style={styles.progress}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {active && (
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: width * 0.4,
              transform: [
                {
                  translateX: x.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-width * 0.4, width],
                  }),
                },
              ],
            },
          ]}
        />
      )}
    </View>
  );
};

/** Red teletext band for a missing page; fades away on its own. */
export const NotFoundBand: React.FC<{ page?: string; onClose: () => void }> = ({
  page,
  onClose,
}) => {
  const theme = useTheme();
  useEffect(() => {
    if (!page) {
      return;
    }
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [page, onClose]);

  if (!page) {
    return null;
  }
  return (
    <Pressable onPress={onClose} style={styles.band} accessibilityRole="alert">
      <Text
        style={[theme.number(24), styles.bandText]}
      >{`Sivua ${page} ei löydy`}</Text>
      <Icon name="close" size={20} color="#fff" />
    </Pressable>
  );
};

/** Shown while a saved copy stands in for a page that couldn't load. */
export const StaleBanner: React.FC<{
  savedAt?: number;
  onRetry: () => void;
}> = ({ savedAt, onRetry }) => {
  if (!savedAt) {
    return null;
  }
  return (
    <Pressable
      onPress={onRetry}
      style={styles.stale}
      accessibilityRole="button"
    >
      <Icon name="cloud-offline-outline" size={16} color={tt.yellow} />
      <Text style={styles.staleText} numberOfLines={1}>
        {`Ei yhteyttä · tallennettu sivu ${formatClock(savedAt)}`}
      </Text>
      <Text style={styles.staleAction}>Päivitä</Text>
    </Pressable>
  );
};

export type MenuItem = { label: string; icon: string; onPress: () => void };

/** Small popover from the ⋯ button. */
export const MoreMenu: React.FC<{
  visible: boolean;
  items: MenuItem[];
  onClose: () => void;
  anchor: "top" | "left";
}> = ({ visible, items, onClose, anchor }) => {
  const theme = useTheme();
  useEffect(() => {
    if (!visible) {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Sulje valikko"
      />
      <View
        style={[
          styles.menu,
          anchor === "top" ? styles.menuTop : styles.menuLeft,
          {
            backgroundColor: theme.glass ? "rgba(40,42,52,0.97)" : "#1a1c21",
            borderColor: theme.surfaceBorder,
          },
        ]}
      >
        {items.map((item, i) => (
          <Pressable
            key={item.label}
            onPress={() => {
              onClose();
              item.onPress();
            }}
            style={({ pressed }) => [
              styles.menuItem,
              i < items.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.separator,
              },
              pressed && { backgroundColor: "rgba(255,255,255,0.06)" },
            ]}
          >
            <Icon name={item.icon} size={20} color={theme.text} />
            <Text style={[styles.menuText, { color: theme.text }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const errorText = (code?: number) => {
  switch (code) {
    case 503:
      return ["EI YHTEYTTÄ", "Sivua ei voitu hakea.", "Tarkista verkkoyhteys."];
    case 504:
      return [
        "AIKAKATKAISU",
        "Sivun haku kesti liian kauan.",
        "Yritä uudelleen.",
      ];
    case 401:
      return [
        "TUNNISTUS EPÄONNISTUI",
        "Päivitä sovellus tai ota",
        "yhteyttä kehittäjään.",
      ];
    default:
      return [
        "SIVUA EI SAATU",
        "Teksti-TV:n palvelussa",
        "on häiriö. Yritä uudelleen.",
      ];
  }
};

/** Errors drawn as a teletext page, with a way to retry and a way home. */
export const ErrorPage: React.FC<{
  page: string;
  code?: number;
  width: number;
  onRetry: () => void;
  onHome: () => void;
}> = ({ page, code, width, onRetry, onHome }) => {
  const theme = useTheme();
  const [headline, ...lines] = errorText(code);
  const n = theme.number;
  return (
    <View style={[styles.error, { width, borderRadius: theme.radius.page }]}>
      <View style={styles.errorBand}>
        <Text style={[n(24), { color: "#fff" }]}>YLE TEKSTI-TV</Text>
        <Text style={[n(24), { color: "#fff" }]}>{page}</Text>
      </View>
      <Text style={[n(44), styles.errorHeadline]}>{headline}</Text>
      {lines.map((l) => (
        <Text key={l} style={[n(26), styles.errorLine]}>
          {l}
        </Text>
      ))}
      {code ? (
        <Text style={[n(24), styles.errorCode]}>{`Virhekoodi ${code}`}</Text>
      ) : null}
      <View style={styles.errorButtons}>
        <Pressable
          onPress={onRetry}
          style={[styles.errorButton, { backgroundColor: tt.yellow }]}
          accessibilityRole="button"
        >
          <Text style={[n(24), { color: "#000" }]}>Yritä uudelleen</Text>
        </Pressable>
        <Pressable
          onPress={onHome}
          style={[styles.errorButton, { backgroundColor: tt.cyan }]}
          accessibilityRole="button"
        >
          <Text style={[n(24), { color: "#000" }]}>Etusivu</Text>
        </Pressable>
      </View>
    </View>
  );
};

/** Lasi theme: a blurred, darkened copy of the page behind everything. */
export const Ambient: React.FC<{ src?: string }> = ({ src }) => {
  if (!src) {
    return null;
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={{ uri: src }}
        blurRadius={45}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, styles.ambient]}
      />
      <View style={[StyleSheet.absoluteFill, styles.ambientShade]} />
    </View>
  );
};

const styles = StyleSheet.create({
  progress: {
    height: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: 2,
    backgroundColor: tt.cyan,
  },
  band: {
    backgroundColor: tt.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bandText: {
    color: "#fff",
  },
  stale: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2a2410",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  staleText: {
    flex: 1,
    color: tt.yellow,
    fontSize: 13,
  },
  staleAction: {
    color: tt.yellow,
    fontSize: 13,
    fontWeight: "700",
  },
  menu: {
    position: "absolute",
    minWidth: 190,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  menuTop: {
    top: 52,
    right: 8,
  },
  menuLeft: {
    bottom: 12,
    left: 80,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuText: {
    fontSize: 16,
  },
  error: {
    backgroundColor: "#000",
    overflow: "hidden",
    paddingBottom: 16,
  },
  errorBand: {
    backgroundColor: tt.blue,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  errorHeadline: {
    color: tt.yellow,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 8,
  },
  errorLine: {
    color: "#fff",
    paddingHorizontal: 12,
  },
  errorCode: {
    color: tt.cyan,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  errorButtons: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 18,
  },
  errorButton: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  ambient: {
    opacity: 0.55,
    transform: [{ scale: 1.3 }],
  },
  ambientShade: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
});
