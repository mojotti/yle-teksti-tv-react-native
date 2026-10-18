import React, { useContext, useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SettingsContext } from "../../providers/settings";
import { PageContext } from "../../providers/page";
import { NavigationStatusContext } from "../../providers/navigation-status";
import { getLinkPages, isDefaultLinks } from "../../utils";
import { useTheme } from "../../theme/theme";
import { favoriteIconName } from "./controls";
import { Chip } from "../ui";
import type { HomeScreenNavigationProp } from "../../../App";

type Section = {
  title: string;
  pages: string[];
  edit?: boolean;
  icon?: string;
};

/** Favourites and this page's links, as the settings ask for. */
const useSections = (): Section[] => {
  const { settings } = useContext(SettingsContext);
  const { textTvResponse } = useContext(PageContext);
  const { page, subPage, isLoadingPageData } = useContext(
    NavigationStatusContext,
  );

  const pageLinks = useMemo(
    () =>
      isLoadingPageData ? [] : getLinkPages(page, subPage, textTvResponse),
    [isLoadingPageData, page, subPage, textTvResponse],
  );

  const favorites = settings.favorites;
  const icon =
    settings.favoriteIcon === "none"
      ? undefined
      : favoriteIconName(settings.favoriteIcon, false);
  // Pages without links fall back to the main sections; say so.
  const quick = isDefaultLinks(pageLinks);
  const favSection = { title: "Suosikit", pages: favorites, edit: true, icon };
  const content = settings.dockContent;
  // Without favourites there is nothing else to show but the links.
  if (!favorites.length || content === "links") {
    return [{ title: quick ? "Pikalinkit" : "Sivun linkit", pages: pageLinks }];
  }
  if (content === "favorites") {
    return [favSection];
  }
  return [
    favSection,
    { title: quick ? "Pikalinkit" : "Tällä sivulla", pages: pageLinks },
  ];
};

const SectionLabel: React.FC<{ section: Section }> = ({ section }) => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: theme.textMuted }]}>
        {section.title.toUpperCase()}
      </Text>
      {section.edit && (
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={[styles.label, { color: theme.textMuted }]}>
            MUOKKAA
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export const Dock: React.FC<{
  onPageChange: (page: string) => void;
  /** The page on screen (a failed page, rather than the last loaded one). */
  current?: string;
}> = ({ onPageChange, current }) => {
  const theme = useTheme();
  const sections = useSections();
  const { page: loadedPage } = useContext(NavigationStatusContext);
  const page = current ?? loadedPage;

  return (
    <View
      style={[
        styles.dock,
        theme.glass && {
          backgroundColor: theme.group,
          borderColor: theme.surfaceBorder,
          borderWidth: 1,
          borderRadius: 20,
          marginHorizontal: 8,
          marginTop: 4,
        },
      ]}
    >
      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <SectionLabel section={s} />
          <ChipScroller
            pages={s.pages}
            icon={s.icon}
            current={page}
            onPageChange={onPageChange}
          />
        </View>
      ))}
    </View>
  );
};

const ChipScroller: React.FC<{
  pages: string[];
  icon?: string;
  current: string;
  onPageChange: (page: string) => void;
}> = ({ pages, icon, current, onPageChange }) => {
  const ref = useRef<ScrollView>(null);
  // Chip positions, so the current page's chip can be scrolled into view.
  const positions = useRef<Record<string, number>>({});
  const reveal = (animated: boolean) => {
    const x = positions.current[current];
    ref.current?.scrollTo({
      x: x === undefined ? 0 : Math.max(0, x - 16),
      animated,
    });
  };
  useEffect(() => {
    reveal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);
  useEffect(() => {
    if (positions.current[current] !== undefined) {
      reveal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {pages.map((p) => (
        <View
          key={p}
          onLayout={(e) => {
            positions.current[p] = e.nativeEvent.layout.x;
            if (p === current) {
              reveal(false);
            }
          }}
        >
          <Chip
            icon={icon}
            page={p}
            current={p === current}
            onPress={() => onPageChange(p)}
          />
        </View>
      ))}
    </ScrollView>
  );
};

/** Landscape: the same sections as a vertical column on the right. */
export const DockColumn: React.FC<{
  onPageChange: (page: string) => void;
  /** The page on screen (a failed page, rather than the last loaded one). */
  current?: string;
}> = ({ onPageChange, current }) => {
  const theme = useTheme();
  const sections = useSections();
  const { page: loadedPage } = useContext(NavigationStatusContext);
  const page = current ?? loadedPage;

  return (
    <ScrollView
      style={[
        styles.column,
        {
          backgroundColor: theme.glass ? "transparent" : theme.chrome,
          borderLeftColor: theme.chromeBorder,
        },
      ]}
      contentContainerStyle={styles.columnContent}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((s) => (
        <View key={s.title} style={styles.columnSection}>
          <Text
            style={[
              styles.label,
              styles.columnLabel,
              { color: theme.textMuted },
            ]}
          >
            {s.title === "Tällä sivulla" ? "SIVULLA" : s.title.toUpperCase()}
          </Text>
          {s.pages.map((p) => (
            <Chip
              icon={s.icon}
              key={p}
              page={p}
              size={22}
              current={p === page}
              onPress={() => onPageChange(p)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dock: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 6,
  },
  section: {
    gap: 5,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  chips: {
    gap: 6,
    paddingHorizontal: 8,
  },
  column: {
    width: 100,
    flexGrow: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  columnContent: {
    padding: 8,
    gap: 14,
  },
  columnSection: {
    gap: 6,
  },
  columnLabel: {
    textAlign: "center",
  },
});
