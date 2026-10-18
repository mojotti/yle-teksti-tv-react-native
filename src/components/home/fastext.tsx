import React, { useContext } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SettingsContext } from "../../providers/settings";
import { tt, useTheme } from "../../theme/theme";
import { Icon } from "../ui";
import { HomeControls } from "./controls";
import { useCoachTarget } from "./onboarding";

type Key = {
  color: string;
  /** Arrow icon before or after the text (the arrows aren't in VT323). */
  lead?: string;
  trail?: string;
  text: string;
  label: string;
  caption: string;
  onPress: () => void;
  enabled: boolean;
  textColor: string;
};

/**
 * The four teletext colour keys. They do exactly what the four swipes do,
 * so the arrows follow the swipe-direction setting.
 */
const useKeys = (c: HomeControls): Key[] => {
  const { settings } = useContext(SettingsContext);
  const vertical = settings.swipe === "pagesVertical";
  const [pagePrev, pageNext, subPrev, subNext] = vertical
    ? ["chevron-up", "chevron-down", "chevron-back", "chevron-forward"]
    : ["chevron-back", "chevron-forward", "chevron-up", "chevron-down"];
  const hasSubs = c.subPageCount > 1;
  const n = c.subPageCount;
  const sub = (x?: number) => (hasSubs ? `${x}/${n}` : "");

  return [
    {
      color: tt.red,
      textColor: "#ffffff",
      lead: pagePrev,
      text: c.prevPage ?? "",
      label: `Edellinen sivu ${c.prevPage ?? ""}`,
      caption: "Edellinen",
      onPress: c.goPrevPage,
      enabled: !!c.prevPage,
    },
    {
      color: tt.green,
      textColor: "#000000",
      trail: pageNext,
      text: c.nextPage ?? "",
      label: `Seuraava sivu ${c.nextPage ?? ""}`,
      caption: "Seuraava",
      onPress: c.goNextPage,
      enabled: !!c.nextPage,
    },
    {
      color: tt.yellow,
      textColor: "#000000",
      lead: subPrev,
      text: sub(c.prevSub),
      label: `Edellinen alasivu ${sub(c.prevSub)}`,
      caption: "Alasivu",
      onPress: c.goPrevSub,
      enabled: hasSubs,
    },
    {
      color: tt.cyan,
      textColor: "#000000",
      trail: subNext,
      text: sub(c.nextSub),
      label: `Seuraava alasivu ${sub(c.nextSub)}`,
      caption: "Alasivu",
      onPress: c.goNextSub,
      enabled: hasSubs,
    },
  ];
};

/** Arrow icon + number, centred on one line. */
const KeyLabel: React.FC<{ k: Key; color: string; size: number }> = ({
  k,
  color,
  size,
}) => {
  const theme = useTheme();
  const icon = (name?: string) =>
    name ? (
      <Icon name={name} size={Math.round(size * 0.75)} color={color} />
    ) : null;
  return (
    <View style={styles.keyLabel}>
      {icon(k.lead)}
      {k.text ? (
        <Text numberOfLines={1} style={[theme.number(size), { color }]}>
          {k.text}
        </Text>
      ) : null}
      {icon(k.trail)}
    </View>
  );
};

export const FastextRow: React.FC<{ c: HomeControls }> = ({ c }) => {
  const theme = useTheme();
  const keys = useKeys(c);
  const coach = useCoachTarget("fastext");
  if (!theme.layout.fastext) {
    return null;
  }

  return (
    <View
      ref={coach.ref}
      onLayout={coach.onLayout}
      collapsable={false}
      style={styles.row}
    >
      {keys.map((k) => (
        <Pressable
          key={k.color}
          onPress={k.onPress}
          disabled={!k.enabled}
          accessibilityRole="button"
          accessibilityLabel={k.label}
          style={({ pressed }) => [
            styles.key,
            {
              borderRadius: theme.radius.fastext,
              opacity: !k.enabled ? 0.3 : pressed ? 0.6 : 1,
            },
            theme.glass
              ? {
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                  borderWidth: 1,
                }
              : { backgroundColor: k.color },
          ]}
        >
          {theme.glass && (
            <View
              style={[
                styles.glow,
                { backgroundColor: k.color, shadowColor: k.color },
              ]}
            />
          )}
          <KeyLabel
            k={k}
            size={22}
            color={theme.glass ? theme.text : k.textColor}
          />
          {theme.glass && (
            <Text style={[styles.caption, { color: theme.textMuted }]}>
              {k.caption}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
};

/** Compact colour ticks for landscape. */
export const FastextTicks: React.FC<{ c: HomeControls }> = ({ c }) => {
  const theme = useTheme();
  const keys = useKeys(c);
  if (!theme.layout.fastext) {
    return null;
  }
  return (
    <View style={styles.ticks}>
      {keys.map((k) => (
        <Pressable
          key={k.color}
          onPress={k.onPress}
          disabled={!k.enabled}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={k.label}
          style={[
            styles.tick,
            { backgroundColor: k.color, opacity: k.enabled ? 1 : 0.3 },
          ]}
        />
      ))}
    </View>
  );
};

/** ‹ ● ○ ○ 1/4 › under the page; hidden for single pages. */
export const SubpageRow: React.FC<{ c: HomeControls; vertical?: boolean }> = ({
  c,
  vertical,
}) => {
  const theme = useTheme();
  if (c.subPageCount <= 1 || (!theme.layout.subpageRow && !vertical)) {
    return null;
  }
  const showDots = c.subPageCount <= 8;
  return (
    <View
      style={[
        styles.sub,
        vertical && styles.subVertical,
        theme.glass && {
          backgroundColor: theme.surface,
          borderColor: theme.surfaceBorder,
          borderWidth: 1,
        },
      ]}
    >
      <Pressable
        onPress={c.goPrevSub}
        hitSlop={12}
        accessibilityLabel="Edellinen alasivu"
      >
        <Icon
          name={vertical ? "chevron-up" : "chevron-back"}
          size={18}
          color={theme.textMuted}
        />
      </Pressable>
      {showDots && !vertical && (
        <View style={styles.dots}>
          {Array.from({ length: c.subPageCount }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i + 1 === c.subPage ? theme.text : "#3a3e46",
                },
                theme.glass && i + 1 === c.subPage && styles.dotWide,
              ]}
            />
          ))}
        </View>
      )}
      <Text
        style={[theme.number(22), { color: theme.text }]}
      >{`${c.subPage}/${c.subPageCount}`}</Text>
      <Pressable
        onPress={c.goNextSub}
        hitSlop={12}
        accessibilityLabel="Seuraava alasivu"
      >
        <Icon
          name={vertical ? "chevron-down" : "chevron-forward"}
          size={18}
          color={theme.textMuted}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  keyLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 24,
  },
  key: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  glow: {
    width: 22,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  caption: {
    fontSize: 10,
    marginTop: 1,
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
  },
  tick: {
    width: 30,
    height: 6,
    borderRadius: 3,
  },
  sub: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
  },
  subVertical: {
    flexDirection: "column",
    gap: 2,
    marginTop: 0,
  },
  dots: {
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotWide: {
    width: 14,
  },
});
