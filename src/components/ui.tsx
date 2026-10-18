import React, { PropsWithChildren } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  View,
  ViewStyle,
} from "react-native";
import _IonIcon from "@react-native-vector-icons/ionicons";
import { tt, useTheme } from "../theme/theme";

export const Icon = _IonIcon as React.ElementType;

/** A page number as a tappable chip. */
export const Chip: React.FC<{
  page: string;
  current?: boolean;
  onPress?: () => void;
  size?: number;
  /** Ionicons name shown before the number (favourite marker). */
  icon?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ page, current, onPress, size = 24, icon, style }) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Sivu ${page}`}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: theme.radius.chip,
          backgroundColor: current ? theme.accent : theme.surface,
          borderColor: current ? theme.accent : theme.surfaceBorder,
          paddingHorizontal: theme.glass ? 13 : 10,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={Math.round(size * 0.62)}
          color={current ? theme.onAccent : theme.text}
          style={styles.chipIcon}
        />
      ) : null}
      <Text
        style={[
          theme.number(size),
          { color: current ? theme.onAccent : theme.text, textAlign: "center" },
        ]}
      >
        {page}
      </Text>
    </Pressable>
  );
};

export const IconButton: React.FC<{
  name: string;
  onPress?: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
  label: string;
  style?: StyleProp<ViewStyle>;
}> = ({ name, onPress, color, size = 22, disabled, label, style }) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: disabled ? 0.3 : pressed ? 0.5 : 1 },
        style,
      ]}
    >
      <Icon name={name} size={size} color={color ?? theme.text} />
    </Pressable>
  );
};

export function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.segmented,
        { backgroundColor: theme.glass ? "rgba(0,0,0,0.3)" : "#0b0c0f" },
      ]}
    >
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => props.onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.segment,
              on && {
                backgroundColor: theme.glass
                  ? "rgba(255,255,255,0.18)"
                  : "#2a2e36",
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: on ? theme.text : theme.textMuted },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Toggle: React.FC<{
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <Switch
    value={value}
    onValueChange={onChange}
    disabled={disabled}
    trackColor={{ false: "#3a3e46", true: tt.green }}
    thumbColor="#ffffff"
    ios_backgroundColor="#3a3e46"
  />
);

export const GroupHeader: React.FC<{ title: string }> = ({ title }) => {
  const theme = useTheme();
  return (
    <Text style={[styles.groupHeader, { color: theme.textMuted }]}>
      {title.toUpperCase()}
    </Text>
  );
};

export const Group: React.FC<PropsWithChildren> = ({ children }) => {
  const theme = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: theme.group,
          borderRadius: theme.radius.group,
          borderColor: theme.glass ? theme.surfaceBorder : "transparent",
        },
      ]}
    >
      {items.map((child, i) => (
        <View
          key={i}
          style={
            i < items.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.separator,
            }
          }
        >
          {child}
        </View>
      ))}
    </View>
  );
};

export const Row: React.FC<
  PropsWithChildren<{
    label: string;
    detail?: string;
    onPress?: () => void;
    disabled?: boolean;
  }>
> = ({ label, detail, onPress, disabled, children }) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      style={({ pressed }) => [
        styles.row,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.rowLabel}>
        <Text style={[styles.rowText, { color: theme.text }]}>{label}</Text>
        {detail ? (
          <Text style={[styles.rowDetail, { color: theme.textMuted }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {children}
    </Pressable>
  );
};

export const Footnote: React.FC<{ text: string }> = ({ text }) => {
  const theme = useTheme();
  return (
    <Text style={[styles.footnote, { color: theme.textMuted }]}>{text}</Text>
  );
};

const styles = StyleSheet.create({
  chipIcon: {
    marginRight: 4,
  },
  chip: {
    flexDirection: "row",
    borderWidth: 1,
    paddingTop: 5,
    paddingBottom: 4,
    minWidth: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 9,
    padding: 2,
    gap: 2,
  },
  segment: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 8,
    marginHorizontal: 6,
  },
  group: {
    overflow: "hidden",
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    paddingVertical: 8,
  },
  rowLabel: {
    flex: 1,
  },
  rowText: {
    fontSize: 16,
  },
  rowDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    marginHorizontal: 6,
  },
});
