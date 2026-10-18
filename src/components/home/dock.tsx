import React, { useContext, useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SettingsContext } from "../../providers/settings";
import { PageContext } from "../../providers/page";
import { NavigationStatusContext } from "../../providers/navigation-status";
import { getLinkPages } from "../../utils";
import { useTheme } from "../../theme/theme";
import { favoriteIconName } from "./controls";
import { Chip, IconButton } from "../ui";
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
  if (!favorites.length) {
    return [{ title: "Sivun linkit", pages: pageLinks }];
  }
  if (settings.favoritesReplaceLinks) {
    return [{ title: "Suosikit", pages: favorites, edit: true, icon }];
  }
  return [
    { title: "Suosikit", pages: favorites, edit: true, icon },
    { title: "Tällä sivulla", pages: pageLinks },
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

export const Dock: React.FC<{ onPageChange: (page: string) => void }> = ({
  onPageChange,
}) => {
  const theme = useTheme();
  const sections = useSections();
  const { page } = useContext(NavigationStatusContext);

  if (theme.layout.classicDock) {
    return <ClassicDock sections={sections} onPageChange={onPageChange} />;
  }

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

/** The original bar: a tab label per row and the settings cog on the right. */
const ClassicDock: React.FC<{
  sections: Section[];
  onPageChange: (page: string) => void;
}> = ({ sections, onPageChange }) => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { page } = useContext(NavigationStatusContext);
  return (
    <View style={[styles.classicDock, { backgroundColor: theme.bg }]}>
      {sections.map((s, i) => (
        <View key={s.title}>
          <View style={styles.classicTabRow}>
            <Text
              style={[
                styles.classicTab,
                { backgroundColor: theme.chrome, color: theme.textMuted },
              ]}
            >
              {s.title === "Suosikit" ? "Suosikkisivut" : s.title}
            </Text>
          </View>
          <View style={[styles.classicRow, { backgroundColor: theme.chrome }]}>
            <View style={styles.flex}>
              <ChipScroller
                pages={s.pages}
                icon={s.icon}
                current={page}
                onPageChange={onPageChange}
              />
            </View>
            {i === 0 && (
              <View style={styles.cog}>
                <IconButton
                  name="cog-outline"
                  size={28}
                  label="Asetukset"
                  onPress={() => navigation.navigate("Settings")}
                />
              </View>
            )}
          </View>
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
  useEffect(() => {
    ref.current?.scrollTo({ x: 0, animated: false });
  }, [pages]);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {pages.map((p) => (
        <Chip
          icon={icon}
          key={p}
          page={p}
          current={p === current}
          onPress={() => onPageChange(p)}
        />
      ))}
    </ScrollView>
  );
};

/** Landscape: the same sections as a vertical column on the right. */
export const DockColumn: React.FC<{ onPageChange: (page: string) => void }> = ({
  onPageChange,
}) => {
  const theme = useTheme();
  const sections = useSections();
  const { page } = useContext(NavigationStatusContext);

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
  classicDock: {
    paddingBottom: 2,
  },
  classicTabRow: {
    flexDirection: "row",
  },
  classicTab: {
    fontSize: 13,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 2,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: "hidden",
  },
  classicRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  flex: {
    flex: 1,
  },
  cog: {
    borderLeftWidth: 1.5,
    borderLeftColor: "rgba(96,96,96,0.4)",
    paddingHorizontal: 4,
  },
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
