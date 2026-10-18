import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconButton } from "../ui";
import { tt, useTheme } from "../../theme/theme";
import { HomeControls, favoriteIconName } from "./controls";
import { useCoachTarget } from "./onboarding";
import { SubpageRow } from "./fastext";

export const PagePill: React.FC<{ c: HomeControls; size?: number }> = ({
  c,
  size = 30,
}) => {
  const theme = useTheme();
  const coach = useCoachTarget("pill");
  return (
    <View ref={coach.ref} onLayout={coach.onLayout} collapsable={false}>
      <Pressable
        onPress={c.openKeypad}
        accessibilityRole="button"
        accessibilityLabel={`Sivu ${c.page}. Avaa numeronäppäimistö.`}
        style={({ pressed }) => [
          styles.pill,
          {
            borderRadius: theme.radius.pill,
            backgroundColor:
              c.pillActive && theme.glass ? theme.accent : theme.surface,
            borderColor: c.pillActive ? theme.accent : theme.surfaceBorder,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text
          style={[
            theme.number(size),
            styles.pillText,
            {
              color: c.pillActive && theme.glass ? theme.onAccent : theme.text,
            },
          ]}
        >
          {c.pillText}
        </Text>
      </Pressable>
    </View>
  );
};

const FavoriteButton: React.FC<{ c: HomeControls }> = ({ c }) => {
  const theme = useTheme();
  const coach = useCoachTarget("favorite");
  return (
    <View ref={coach.ref} onLayout={coach.onLayout} collapsable={false}>
      <IconButton
        name={favoriteIconName(c.favoriteIcon, c.isFavorite)}
        color={
          c.isFavorite ? (theme.glass ? "#ff6b7a" : tt.red) : theme.textMuted
        }
        label={c.isFavorite ? "Poista suosikeista" : "Lisää suosikkeihin"}
        onPress={c.toggleFavorite}
      />
    </View>
  );
};

/** Right-hand controls: refresh, share and the ⋯ menu. */
const Trailing: React.FC<{ c: HomeControls }> = ({ c }) => (
  <>
    <IconButton name="refresh-outline" label="Päivitä" onPress={c.refresh} />
    {c.share && (
      <IconButton name="share-outline" label="Jaa sivu" onPress={c.share} />
    )}
    <IconButton name="ellipsis-horizontal" label="Lisää" onPress={c.openMenu} />
  </>
);

/** Portrait header: back, home, page pill, favourite … share, menu. */
export const Header: React.FC<{ c: HomeControls }> = ({ c }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.headerBox,
        theme.glass
          ? [
              styles.glassHeader,
              {
                backgroundColor: theme.chrome,
                borderColor: theme.chromeBorder,
              },
            ]
          : {
              backgroundColor: theme.chrome,
              borderBottomColor: theme.chromeBorder,
            },
      ]}
    >
      <View style={styles.header}>
        {c.canGoBack && (
          <IconButton name="chevron-back" label="Takaisin" onPress={c.goBack} />
        )}
        <IconButton
          name="home-outline"
          label="Etusivu"
          onPress={c.goHome}
          disabled={c.page === "100"}
        />
        <PagePill c={c} />
        <FavoriteButton c={c} />
        <View style={styles.grow} />
        <Trailing c={c} />
      </View>
      {/* Titles can be long ("DIGI-TV- JA TEKSTI-TV-TIETOA"), so they get a row. */}
      {/* Always present, so the page doesn't jump between pages. */}
      <Text
        numberOfLines={2}
        style={[styles.title, { color: theme.textMuted }]}
      >
        {c.title || " "}
      </Text>
    </View>
  );
};

/** Landscape left rail with the same controls stacked vertically. */
export const Rail: React.FC<{ c: HomeControls }> = ({ c }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.rail,
        {
          backgroundColor: theme.glass ? "transparent" : theme.chrome,
          borderRightColor: theme.chromeBorder,
        },
      ]}
    >
      {c.canGoBack && (
        <IconButton name="chevron-back" label="Takaisin" onPress={c.goBack} />
      )}
      <IconButton
        name="home-outline"
        label="Etusivu"
        onPress={c.goHome}
        disabled={c.page === "100"}
      />
      <PagePill c={c} size={26} />
      <FavoriteButton c={c} />
      <View style={styles.grow} />
      <SubpageRow c={c} vertical />
      <Trailing c={c} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerBox: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
  },
  glassHeader: {
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  pill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 2,
    minWidth: 64,
    alignItems: "center",
  },
  pillText: {
    letterSpacing: 1,
  },
  grow: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    paddingHorizontal: 14,
    marginTop: -6,
    paddingBottom: 7,
  },
  rail: {
    width: 72,
    alignItems: "center",
    paddingVertical: 8,
    gap: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});

/** Header for the favourites feed. */
export const FeedHeader: React.FC<{
  onHome: () => void;
  onKeypad: () => void;
  onMenu: () => void;
}> = ({ onHome, onKeypad, onMenu }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.headerBox,
        theme.glass
          ? [
              styles.glassHeader,
              {
                backgroundColor: theme.chrome,
                borderColor: theme.chromeBorder,
              },
            ]
          : {
              backgroundColor: theme.chrome,
              borderBottomColor: theme.chromeBorder,
            },
      ]}
    >
      <View style={styles.header}>
        <IconButton name="home-outline" label="Etusivu" onPress={onHome} />
        <Text style={[theme.number(28), { color: theme.text }]}>Suosikit</Text>
        <View style={styles.grow} />
        <IconButton
          name="keypad-outline"
          label="Avaa numeronäppäimistö"
          onPress={onKeypad}
        />
        <IconButton name="ellipsis-horizontal" label="Lisää" onPress={onMenu} />
      </View>
    </View>
  );
};
