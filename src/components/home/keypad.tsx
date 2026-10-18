import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isValidPage } from "../../utils";
import { tt, useTheme } from "../../theme/theme";
import { OrientationTypes, WindowContext } from "../../providers/window";
import { Chip, Icon } from "../ui";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "home", "0", "back"];

export type KeypadResult =
  | { type: "typing"; digits: string }
  | { type: "submit"; page: string }
  | { type: "invalid" };

/**
 * What one key press does. The third digit submits a page in 100–899;
 * anything else there is rejected and the entry starts over.
 */
export const pressKey = (digits: string, key: string): KeypadResult => {
  if (key === "back") {
    return { type: "typing", digits: digits.slice(0, -1) };
  }
  if (key === "home") {
    return { type: "submit", page: "100" };
  }
  const next = (digits + key).slice(0, 3);
  if (next.length < 3) {
    return { type: "typing", digits: next };
  }
  return isValidPage(next)
    ? { type: "submit", page: next }
    : { type: "invalid" };
};

/**
 * Remote-control style number pad. In landscape the entry and shortcuts sit
 * beside the keys so the sheet fits the short screen.
 */
export const Keypad: React.FC<{
  visible: boolean;
  title?: string;
  recent?: string[];
  favorites?: string[];
  homeKey?: boolean;
  onDigits?: (digits: string) => void;
  onSubmit: (page: string) => void;
  onClose: () => void;
}> = ({
  visible,
  title,
  recent = [],
  favorites = [],
  homeKey = true,
  onDigits,
  onSubmit,
  onClose,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { orientation } = useContext(WindowContext);
  const landscape = orientation === OrientationTypes.Landscape;
  const [digits, setDigits] = useState("");
  const [invalid, setInvalid] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setDigits("");
    setInvalid(false);
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  useEffect(() => {
    onDigits?.(digits);
  }, [digits, onDigits]);

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

  const runShake = () => {
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 0].map((v) =>
        Animated.timing(shake, {
          toValue: v,
          duration: 45,
          useNativeDriver: true,
        }),
      ),
    ).start();
  };

  const submit = (page: string) => {
    setDigits("");
    onSubmit(page);
  };

  const press = (key: string) => {
    const result = pressKey(digits, key);
    if (result.type === "submit") {
      submit(result.page);
    } else if (result.type === "invalid") {
      setInvalid(true);
      setDigits("");
      runShake();
    } else {
      setInvalid(false);
      setDigits(result.digits);
    }
  };

  const quick = [
    ...new Set([...recent.slice(-3).reverse(), ...favorites]),
  ].slice(0, landscape ? 4 : 6);

  const entry = (
    <View style={styles.entryBlock}>
      {title && (
        <Text style={[styles.title, { color: theme.textMuted }]}>{title}</Text>
      )}
      <Animated.View
        style={[styles.entry, { transform: [{ translateX: shake }] }]}
        accessibilityLabel={`Sivunumero ${digits || "tyhjä"}`}
      >
        {[0, 1, 2].map((i) => {
          const d = digits[i];
          const active = i === digits.length;
          return (
            <View
              key={i}
              style={[
                styles.slot,
                theme.glass
                  ? {
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderColor: active
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.12)",
                      borderWidth: 1,
                      borderRadius: 14,
                    }
                  : {
                      borderBottomWidth: 3,
                      borderBottomColor: d || active ? tt.yellow : "#3a3e46",
                    },
              ]}
            >
              <Text
                style={[
                  theme.number(theme.glass ? 60 : 58),
                  styles.slotText,
                  { color: theme.glass ? theme.text : tt.yellow },
                ]}
              >
                {d ?? " "}
              </Text>
            </View>
          );
        })}
      </Animated.View>
      <Text
        style={[styles.hint, { color: invalid ? tt.red : theme.textMuted }]}
      >
        {invalid
          ? "Sivunumeron pitää olla väliltä 100–899"
          : "Kirjoita sivunumero (100–899)"}
      </Text>
      {quick.length > 0 && (
        <View style={styles.quick}>
          {quick.map((p) => (
            <Chip key={p} page={p} size={20} onPress={() => submit(p)} />
          ))}
        </View>
      )}
    </View>
  );

  const keys = (
    <View style={[styles.keys, landscape && styles.keysLandscape]}>
      {KEYS.map((k) => {
        if (k === "home" && !homeKey) {
          return <View key={k} style={styles.key} />;
        }
        const word = k === "back" || k === "home";
        return (
          <Pressable
            key={k}
            onPress={() => press(k)}
            accessibilityRole="button"
            accessibilityLabel={
              k === "back" ? "Poista numero" : k === "home" ? "Etusivu" : k
            }
            style={({ pressed }) => [
              styles.key,
              { height: landscape ? 42 : 54 },
              {
                backgroundColor: theme.glass
                  ? word
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(255,255,255,0.12)"
                  : "#1d2026",
                borderRadius: theme.glass ? 16 : theme.radius.key,
                borderWidth: theme.glass ? 1 : 0,
                borderColor: "rgba(255,255,255,0.1)",
                opacity: pressed ? 0.55 : 1,
              },
            ]}
          >
            {k === "back" ? (
              <Icon name="backspace-outline" size={24} color={theme.text} />
            ) : k === "home" ? (
              <Text style={[styles.keyWord, { color: theme.text }]}>
                Etusivu
              </Text>
            ) : (
              <Text
                style={[
                  theme.number(landscape ? 30 : 36),
                  { color: theme.text },
                ]}
              >
                {k}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
        onPress={onClose}
        accessibilityLabel="Sulje näppäimistö"
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.sheet,
            borderColor: theme.surfaceBorder,
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
            paddingBottom: (landscape ? 8 : 14) + insets.bottom,
            transform: [
              {
                translateY: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              },
            ],
          },
          theme.glass && styles.glassSheet,
          landscape && styles.sheetLandscape,
        ]}
      >
        {!landscape && <View style={styles.grab} />}
        {landscape ? (
          <View style={styles.row}>
            {entry}
            {keys}
          </View>
        ) : (
          <>
            {entry}
            {keys}
          </>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 12,
  },
  glassSheet: {
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 28,
    borderWidth: 1,
  },
  sheetLandscape: {
    left: "12%",
    right: "12%",
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3a3e46",
    alignSelf: "center",
  },
  entryBlock: {
    flex: 1,
    gap: 10,
  },
  title: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  entry: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  slot: {
    width: 56,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  slotText: {
    textAlign: "center",
  },
  hint: {
    textAlign: "center",
    fontSize: 13,
  },
  quick: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  keys: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  keysLandscape: {
    flex: 1.2,
    rowGap: 6,
  },
  key: {
    width: "31.5%",
    alignItems: "center",
    justifyContent: "center",
  },
  keyWord: {
    fontSize: 15,
    fontWeight: "600",
  },
});
