import React, { useCallback, useContext, useEffect, useState } from "react";
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
import { PageContext } from "../../providers/page";
import { SettingsContext } from "../../providers/settings";
import { getPageImgSrc, getPageTitle } from "../../utils";
import { TextTvResponse } from "../../types/response";
import { tt, useTheme } from "../../theme/theme";
import { getOfflinePage } from "../../utils/offline";
import { cropFrame, IMAGE, pageInset } from "../../utils/page-geometry";

/** Shape of the visible (cropped) part of a page image. */
const IMAGE_RATIO = (IMAGE.height - IMAGE.bottom) / (IMAGE.width - IMAGE.left);

/**
 * Start view with every favourite page stacked, in the user's order.
 * Swipe a card sideways for its subpages; tap to open the page.
 */
export const FavoritesFeed: React.FC<{
  onOpen: (page: string, subPage: string) => void;
}> = ({ onOpen }) => {
  const theme = useTheme();
  const { settings } = useContext(SettingsContext);
  const [width, setWidth] = useState(0);
  const [stamp, setStamp] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setStamp(Date.now());
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  if (!settings.favorites.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Suosikkeja ei vielä ole. Lisää sivu suosikiksi yläpalkin sydämestä tai
          kohdasta Asetukset → Suosikit, niin se näkyy täällä.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="favorites-feed"
      data={settings.favorites}
      keyExtractor={(p) => p}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor="#fff"
          colors={[tt.cyan]}
        />
      }
      ListFooterComponent={
        settings.favorites.length < 3 ? (
          <Text style={[styles.footer, { color: theme.textMuted }]}>
            Lisää sivuja suosikeiksi yläpalkin sydämestä tai kohdasta Asetukset
            → Suosikit, niin ne näkyvät tässä allekkain.
          </Text>
        ) : null
      }
      renderItem={({ item }) =>
        width ? (
          <Card
            page={item}
            width={width - theme.pageInset * 2}
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
  stamp: number;
  onOpen: (page: string, subPage: string) => void;
}> = ({ page, width, stamp, onOpen }) => {
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
  const height = (width - inset * 2) * IMAGE_RATIO + inset * 2;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setCurrent(Math.round(e.nativeEvent.contentOffset.x / width) + 1);

  return (
    <View style={[styles.card, { marginHorizontal: theme.pageInset }]}>
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
          >{`Sivua ${page} ei saatu`}</Text>
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
    gap: 14,
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
