import React, { useEffect, useRef, useState } from "react";
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
import { Chip, Icon } from "../ui";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "home", "0", "back"];

/**
 * Remote-control style number pad. The third digit submits; numbers outside
 * 100–899 shake the display instead.
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
    if (key === "back") {
      setInvalid(false);
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (key === "home") {
      submit("100");
      return;
    }
    const next = (digits + key).slice(0, 3);
    if (next.length === 3) {
      if (isValidPage(next)) {
        submit(next);
      } else {
        setInvalid(true);
        runShake();
        setDigits("");
      }
      return;
    }
    setInvalid(false);
    setDigits(next);
  };

  if (!visible) {
    return null;
  }

  const quick = [
    ...new Set([...recent.slice(-3).reverse(), ...favorites]),
  ].slice(0, 6);
  const slots = [0, 1, 2].map((i) => digits[i]);

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
            paddingBottom: 14 + insets.bottom,
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
        ]}
      >
        <View style={styles.grab} />
        {title && (
          <Text style={[styles.title, { color: theme.textMuted }]}>
            {title}
          </Text>
        )}
        <Animated.View
          style={[styles.entry, { transform: [{ translateX: shake }] }]}
        >
          {slots.map((d, i) =>
            theme.glass ? (
              <Text
                key={i}
                style={[
                  styles.glassDigit,
                  { color: d ? theme.text : "rgba(255,255,255,0.25)" },
                ]}
              >
                {d ?? "0"}
              </Text>
            ) : (
              <View
                key={i}
                style={[
                  styles.slot,
                  { borderBottomColor: d ? tt.yellow : "#3a3e46" },
                ]}
              >
                <Text
                  style={[
                    theme.number(58),
                    { color: tt.yellow, textAlign: "center" },
                  ]}
                >
                  {d ?? " "}
                </Text>
              </View>
            ),
          )}
        </Animated.View>
        <Text
          style={[styles.hint, { color: invalid ? tt.red : theme.textMuted }]}
        >
          {invalid
            ? "Sivunumerot ovat 100–899"
            : "Sivut 100–899 · kolmas numero avaa sivun"}
        </Text>
        {quick.length > 0 && (
          <View style={styles.quick}>
            {quick.map((p) => (
              <Chip key={p} page={p} size={20} onPress={() => submit(p)} />
            ))}
          </View>
        )}
        <View style={[styles.keys, theme.glass && styles.glassKeys]}>
          {KEYS.map((k) => {
            if (k === "home" && !homeKey) {
              return (
                <View
                  key={k}
                  style={theme.glass ? styles.glassKey : styles.key}
                />
              );
            }
            const label =
              k === "back" ? (
                <Icon name="backspace-outline" size={24} color={theme.text} />
              ) : k === "home" ? (
                <Text style={[styles.keyWord, { color: theme.text }]}>
                  Etusivu
                </Text>
              ) : (
                <Text
                  style={
                    theme.glass
                      ? [styles.glassKeyText, { color: theme.text }]
                      : [theme.number(36), { color: theme.text }]
                  }
                >
                  {k}
                </Text>
              );
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
                  theme.glass ? styles.glassKey : styles.key,
                  {
                    backgroundColor:
                      word && theme.glass
                        ? "transparent"
                        : theme.glass
                          ? "rgba(255,255,255,0.13)"
                          : "#1d2026",
                    borderRadius: theme.radius.key,
                    opacity: pressed ? 0.55 : 1,
                  },
                ]}
              >
                {label}
              </Pressable>
            );
          })}
        </View>
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
    gap: 10,
  },
  glassSheet: {
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 28,
    borderWidth: 1,
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3a3e46",
    alignSelf: "center",
  },
  title: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  entry: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  slot: {
    width: 40,
    borderBottomWidth: 3,
  },
  glassDigit: {
    fontSize: 48,
    fontWeight: "300",
    width: 34,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  hint: {
    textAlign: "center",
    fontSize: 12,
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
  glassKeys: {
    justifyContent: "center",
    columnGap: 26,
    rowGap: 10,
    paddingHorizontal: 20,
  },
  key: {
    width: "31.5%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  glassKey: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  glassKeyText: {
    fontSize: 28,
    fontWeight: "400",
  },
  keyWord: {
    fontSize: 15,
    fontWeight: "600",
  },
});
