import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppStateContext } from "../../providers/app-state";
import { PageContext } from "../../providers/page";
import { ScreenRatio, SettingsContext } from "../../providers/settings";
import { WindowContext, OrientationTypes } from "../../providers/window";
import { ratioHeights } from "../../utils";
import { getPageImgSrc, getPageTitle } from "../../utils";
import { TextTvResponse } from "../../types/response";
import { tt, useTheme } from "../../theme/theme";
import { getOfflinePage } from "../../utils/offline";
import { cropFrame, IMAGE, pageInset } from "../../utils/page-geometry";

/** Shape of the visible (cropped) part of a page image. */
const IMAGE_RATIO = (IMAGE.height - IMAGE.bottom) / (IMAGE.width - IMAGE.left);

/** Room taken by a card's title row and the gap below it. */
const CARD_CHROME = 58;
const GAP = 14;
const MAX_COLUMNS = 3;

/**
 * Card image height as a share of its width. By default the page's own
 * shape; with "same size as pages" on, the page view's size setting
 * (landscape is always TV 4:3, like the page view).
 */
const cardRatio = (
  screenRatio: ScreenRatio | undefined,
  isLandscape: boolean,
  size: { width: number; height: number },
  inset: number,
) => {
  if (!screenRatio) {
    return IMAGE_RATIO;
  }
  if (isLandscape) {
    return 3 / 4;
  }
  if (screenRatio === "full") {
    // One card fills the feed's height.
    const w = size.width - inset * 2;
    return w > 0 ? Math.max(IMAGE_RATIO, (size.height - CARD_CHROME) / w) : 1;
  }
  return ratioHeights[screenRatio];
};

/**
 * How many cards side by side. Portrait shows one column; landscape adds
 * columns until a whole card fits on screen.
 */
const columnsFor = (
  width: number,
  height: number,
  inset: number,
  ratio: number,
) => {
  if (width <= height) {
    return 1;
  }
  for (let cols = 1; cols < MAX_COLUMNS; cols++) {
    const w = (width - inset * 2 - GAP * (cols - 1)) / cols;
    if (w * ratio + CARD_CHROME <= height) {
      return cols;
    }
  }
  return MAX_COLUMNS;
};

/**
 * Start view with every favourite page stacked, in the user's order.
 * Swipe a card sideways for its subpages; tap to open the page.
 */
export const FavoritesFeed: React.FC<{
  onOpen: (page: string, subPage: string) => void;
  /** Opens the keypad for adding a favourite by number. */
  onAdd?: () => void;
}> = ({ onOpen, onAdd }) => {
  const theme = useTheme();
  const { settings } = useContext(SettingsContext);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [stamp, setStamp] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setStamp(Date.now());
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // Reload every card when the app comes back to the foreground.
  const { appState } = useContext(AppStateContext);
  const lastAppState = useRef(appState);
  useEffect(() => {
    if (appState === "active" && lastAppState.current !== "active") {
      setStamp(Date.now());
    }
    lastAppState.current = appState;
  }, [appState]);

  const addButton = onAdd ? (
    <Pressable
      onPress={onAdd}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.addButton,
        {
          backgroundColor: theme.surface,
          borderColor: theme.surfaceBorder,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.addText, { color: theme.text }]}>
        + Lisää suosikki
      </Text>
    </Pressable>
  ) : null;

  const { orientation } = useContext(WindowContext);
  const ratio = cardRatio(
    settings.feedUsesPageSize ? settings.screenRatio : undefined,
    orientation === OrientationTypes.Landscape,
    size,
    theme.pageInset,
  );
  const columns = columnsFor(size.width, size.height, theme.pageInset, ratio);
  const cardWidth =
    (size.width - theme.pageInset * 2 - GAP * (columns - 1)) / columns;

  if (!settings.favorites.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Suosikkeja ei vielä ole. Lisää sivu suosikiksi yläpalkin sydämestä tai
          kohdasta Asetukset → Suosikit, niin se näkyy täällä.
        </Text>
        {addButton}
      </View>
    );
  }

  return (
    <FlatList
      testID="favorites-feed"
      // numColumns can't change on the fly, so a new list per column count.
      key={`columns-${columns}`}
      numColumns={columns}
      data={settings.favorites}
      keyExtractor={(p) => p}
      onLayout={(e) =>
        setSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
      contentContainerStyle={styles.list}
      columnWrapperStyle={
        columns > 1
          ? { gap: GAP, paddingHorizontal: theme.pageInset }
          : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor="#fff"
          colors={[tt.cyan]}
        />
      }
      ListFooterComponent={
        <View style={styles.footerBox}>
          {addButton}
          {settings.favorites.length < 3 && (
            <Text style={[styles.footer, { color: theme.textMuted }]}>
              Lisää sivuja suosikeiksi yläpalkin sydämestä, tästä tai kohdasta
              Asetukset → Suosikit. Myös sivun, joka ilmestyy vain tiettyinä
              päivinä, voi lisätä.
            </Text>
          )}
        </View>
      }
      renderItem={({ item }) =>
        size.width ? (
          <Card
            page={item}
            width={cardWidth}
            ratio={ratio}
            inRow={columns > 1}
            stamp={stamp}
            onOpen={onOpen}
          />
        ) : null
      }
    />
  );
};

const Card: React.FC<{
  page: string;
  width: number;
  ratio: number;
  /** Side by side with other cards; the row adds the side margins. */
  inRow: boolean;
  stamp: number;
  onOpen: (page: string, subPage: string) => void;
}> = ({ page, width, ratio, inRow, stamp, onOpen }) => {
  const theme = useTheme();
  const { loadResponse } = useContext(PageContext);
  const [response, setResponse] = useState<TextTvResponse | null>();
  // Saved images, used when the page can't be fetched.
  const [saved, setSaved] = useState<Record<string, string>>();
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    let alive = true;
    loadResponse(page, true).then(async (r) => {
      if (!alive) {
        return;
      }
      if (r) {
        setSaved(undefined);
        setResponse(r);
        return;
      }
      const offline = await getOfflinePage(page).catch(() => undefined);
      if (alive) {
        setSaved(offline?.images);
        setResponse(offline?.response ?? null);
      }
    });
    return () => {
      alive = false;
    };
    // loadResponse is recreated on every render; reload only on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, stamp]);

  const count = Number(response?.page.subPageCount || 1);
  const inset = pageInset(theme.radius.page);
  const height = (width - inset * 2) * ratio + inset * 2;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setCurrent(Math.round(e.nativeEvent.contentOffset.x / width) + 1);

  return (
    <View
      style={[
        styles.card,
        inRow ? { width } : { marginHorizontal: theme.pageInset },
      ]}
    >
      <Pressable
        onPress={() => onOpen(page, String(current))}
        style={styles.cardHeader}
        accessibilityRole="button"
      >
        <Text
          style={[
            theme.number(26),
            { color: theme.accent === "#ffffff" ? "#fff" : theme.accent },
          ]}
        >
          {page}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.cardTitle, { color: theme.textMuted }]}
        >
          {response ? getPageTitle(response) : ""}
        </Text>
        {count > 1 && (
          <View style={styles.dots}>
            {Array.from({ length: Math.min(count, 8) }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i + 1 === current ? "#fff" : "#3a3e46" },
                ]}
              />
            ))}
          </View>
        )}
      </Pressable>
      {response === null ? (
        <View style={[styles.missing, { width, height }]}>
          <Text
            style={[theme.number(24), { color: tt.red }]}
          >{`Sivu ${page} ei ole nyt saatavilla`}</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={Array.from({ length: count }, (_, i) => String(i + 1))}
          keyExtractor={(n) => n}
          onMomentumScrollEnd={onScroll}
          style={{ width, height, borderRadius: theme.radius.page }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onOpen(page, item)}
              accessibilityLabel={`Avaa sivu ${page}, alasivu ${item}`}
              style={[styles.slide, { width, height }]}
            >
              <View
                style={[
                  styles.inner,
                  {
                    top: inset,
                    left: inset,
                    width: width - inset * 2,
                    height: height - inset * 2,
                  },
                ]}
              >
                <Image
                  source={{
                    uri:
                      saved?.[item] ??
                      `${getPageImgSrc(page, item)}&cacheValid=${stamp}`,
                  }}
                  resizeMode="stretch"
                  style={[
                    styles.image,
                    cropFrame(width - inset * 2, height - inset * 2),
                  ]}
                />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    position: "absolute",
  },
  slide: {
    overflow: "hidden",
    backgroundColor: "#000",
  },
  inner: {
    position: "absolute",
    overflow: "hidden",
  },
  list: {
    paddingBottom: 16,
    gap: GAP,
  },
  card: {
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  dots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  missing: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  footerBox: {
    gap: 12,
    paddingTop: 8,
    alignItems: "center",
  },
  addButton: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  addText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 21,
  },
});
