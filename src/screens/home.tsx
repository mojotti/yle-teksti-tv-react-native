import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BackHandler,
  LayoutRectangle,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { PageContext } from "../providers/page";
import { NavigationStatusContext } from "../providers/navigation-status";
import { AppStateContext } from "../providers/app-state";
import { MAX_FAVORITES, SettingsContext } from "../providers/settings";
import { OrientationTypes, WindowContext } from "../providers/window";
import { getNewSubPage, getPageSize, isValidPage } from "../utils";
import {
  addFavorite,
  buildPageModel,
  parsePageLink,
  wantsFeed,
} from "./home-model";
import { useTheme } from "../theme/theme";
import type { HomeScreenNavigationProp } from "../../App";

import {
  GestureRecognizer,
  SwipeDirections,
} from "../components/gesture-recognizer";
import { HomeControls } from "../components/home/controls";
import { Header, Rail } from "../components/home/header";
import {
  FastextRow,
  FastextTicks,
  SubpageRow,
} from "../components/home/fastext";
import { Dock, DockColumn } from "../components/home/dock";
import { PageView } from "../components/home/page-view";
import { Keypad } from "../components/home/keypad";
import { ShareSheet } from "../components/home/share-sheet";
import { FavoritesFeed } from "../components/home/favorites-feed";
import { FeedHeader } from "../components/home/header";
import { CoachProvider, Onboarding } from "../components/home/onboarding";
import {
  Ambient,
  ErrorPage,
  MoreMenu,
  NotFoundBand,
  StaleBanner,
  ProgressLine,
  useDelayed,
} from "../components/home/overlays";

const SUBPAGE_ROW_HEIGHT = 42;

export const Home: React.FC = () => (
  <CoachProvider>
    <HomeScreen />
  </CoachProvider>
);

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const {
    fetchPage,
    prefetch,
    error,
    invalidateCache,
    textTvResponse,
    imgSrc,
    stale,
  } = useContext(PageContext);
  const nav = useContext(NavigationStatusContext);
  const { page, subPage, setSubPage, history, pushHistory, popHistory } = nav;
  const { appState } = useContext(AppStateContext);
  const { settings, loaded, update } = useContext(SettingsContext);
  const { orientation } = useContext(WindowContext);
  const isLandscape = orientation === OrientationTypes.Landscape;

  const [keypadOpen, setKeypadOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // Favourites feed as the start view (setting), or opened from the menu.
  const [feed, setFeed] = useState(false);
  const [fromFeed, setFromFeed] = useState(false);
  const startViewApplied = React.useRef(false);
  const linkTarget = React.useRef<string>(undefined);
  // A link can arrive before settings load; the start view must not undo it.
  const openedFromLink = React.useRef(false);
  const [digits, setDigits] = useState("");
  const [pending, setPending] = useState<string>();
  const [notFound, setNotFound] = useState<string>();
  const [area, setArea] = useState<LayoutRectangle>();

  const isLoading = nav.isLoadingImg || nav.isLoadingPageData;
  const showLoading = useDelayed(isLoading);
  const hasError = !!error && error.code !== 404;

  // Start view: on launch, and again whenever the setting changes.
  useEffect(() => {
    if (!loaded) {
      return;
    }
    if (!startViewApplied.current) {
      startViewApplied.current = true;
      setFeed(
        wantsFeed(
          settings.startView,
          settings.favorites,
          openedFromLink.current,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const startView = settings.startView;
  // Only changes made after settings have loaded count (loading itself is
  // handled above, and must not undo a page opened from a link).
  const previousStartView = React.useRef<string>(undefined);
  useEffect(() => {
    if (!loaded) {
      return;
    }
    if (
      previousStartView.current !== undefined &&
      previousStartView.current !== startView
    ) {
      setFeed(wantsFeed(startView, settings.favorites));
    }
    previousStartView.current = startView;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startView, loaded]);

  // tekstitv://page/201 (from the widget) opens that page.
  useEffect(() => {
    const open = async (url: string | null) => {
      const link = parsePageLink(url);
      if (link) {
        linkTarget.current = link.page;
        openedFromLink.current = true;
        setFeed(false);
        setKeypadOpen(false);
        setPending(link.page);
        await fetchPage(link.page, link.subPage, false, true);
        if (link.subPage !== "1") {
          setSubPage(link.subPage);
        }
      }
    };
    Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener("url", (e) => open(e.url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh whenever the app comes back to the foreground.
  useEffect(() => {
    if (appState === "active") {
      invalidateCache();
      // A widget link may have arrived just before; load that page instead.
      const target = linkTarget.current;
      if (target && target !== page) {
        fetchPage(target, "1", true, true);
      } else {
        fetchPage(page, subPage, true, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  useEffect(() => {
    pushHistory(page);
    setPending(undefined);
    if (linkTarget.current === page) {
      linkTarget.current = undefined;
    }
  }, [page, pushHistory]);

  useEffect(() => {
    if (error?.code === 404) {
      setNotFound(error.page);
    }
    if (error) {
      setPending(undefined);
    }
  }, [error]);

  // Preload what the colour keys point at, so they switch instantly.
  useEffect(() => {
    if (isLoading || !textTvResponse) {
      return;
    }
    const { prevPage, nextPage, subPageCount, number } = textTvResponse.page;
    const t = setTimeout(() => {
      nextPage && prefetch(nextPage);
      prevPage && prefetch(prevPage);
      const next = getNewSubPage(Number(subPage), Number(subPageCount), "next");
      if (Number(subPageCount) > 1 && next) {
        prefetch(number, String(next));
      }
    }, 400);
    return () => clearTimeout(t);
  }, [isLoading, textTvResponse, subPage, prefetch]);

  const goTo = useCallback(
    (target: string) => {
      if (!isValidPage(target)) {
        return;
      }
      setKeypadOpen(false);
      setPending(target);
      fetchPage(target, "1", false, true);
    },
    [fetchPage],
  );

  const canGoBack = history.length > 1 || fromFeed;
  const goBack = useCallback(() => {
    if (feed) {
      return false;
    }
    const previous = popHistory();
    if (previous) {
      // The page effect pushes it again once it has loaded.
      popHistory();
      goTo(previous);
      return true;
    }
    if (fromFeed) {
      setFeed(true);
      return true;
    }
    return false;
  }, [popHistory, goTo, feed, fromFeed]);

  const openFromFeed = async (target: string, sub: string) => {
    setFeed(false);
    setFromFeed(true);
    setPending(target);
    await fetchPage(target, sub, false, true);
    setSubPage(sub);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () =>
      navigation.isFocused() ? goBack() : false,
    );
    return () => sub.remove();
  }, [goBack, navigation]);

  const model = buildPageModel({
    page,
    subPage,
    pending,
    keypadOpen,
    digits,
    response: textTvResponse,
    error,
  });
  const { subPageCount } = model;
  const changeSub = (direction: "next" | "back") => {
    const target = getNewSubPage(model.subPage, subPageCount, direction);
    if (subPageCount <= 1 || !target) {
      return;
    }
    fetchPage(page, String(target));
    setSubPage(String(target));
  };

  const isFavorite = settings.favorites.includes(model.page);

  const c: HomeControls = {
    ...model,
    pillActive: keypadOpen,
    isLoading,
    canGoBack,
    isFavorite,
    favoriteIcon: settings.favoriteIcon,
    goBack: () => goBack(),
    goHome: () => goTo("100"),
    goTo,
    goPrevPage: () => model.prevPage && goTo(model.prevPage),
    goNextPage: () => model.nextPage && goTo(model.nextPage),
    goPrevSub: () => changeSub("back"),
    goNextSub: () => changeSub("next"),
    openKeypad: () => setKeypadOpen(true),
    toggleFavorite: () =>
      update({
        favorites: isFavorite
          ? settings.favorites.filter((f) => f !== model.page)
          : addFavorite(settings.favorites, model.page, MAX_FAVORITES),
      }),
    openMenu: () => setMenuOpen(true),
    share: textTvResponse && !hasError ? () => setShareOpen(true) : undefined,
    refresh: () =>
      hasError
        ? fetchPage(error!.page, "1", true, true)
        : fetchPage(page, subPage, true),
  };

  const onSwipe = (direction: SwipeDirections) => {
    if (keypadOpen) {
      return;
    }
    const vertical = settings.swipe === "pagesVertical";
    const actions: Record<SwipeDirections, () => void> = vertical
      ? {
          SWIPE_UP: c.goNextPage,
          SWIPE_DOWN: c.goPrevPage,
          SWIPE_LEFT: c.goNextSub,
          SWIPE_RIGHT: c.goPrevSub,
        }
      : {
          SWIPE_LEFT: c.goNextPage,
          SWIPE_RIGHT: c.goPrevPage,
          SWIPE_UP: c.goNextSub,
          SWIPE_DOWN: c.goPrevSub,
        };
    actions[direction]();
  };

  const pageSize = useMemo(() => {
    if (!area) {
      return { width: 0, height: 0 };
    }
    const reserved = isLandscape
      ? 18
      : settings.showSubpageRow
        ? SUBPAGE_ROW_HEIGHT
        : 0;
    return getPageSize(
      settings.screenRatio,
      area.width - theme.pageInset * 2,
      area.height - reserved,
      isLandscape,
    );
  }, [
    area,
    isLandscape,
    settings.showSubpageRow,
    settings.screenRatio,
    theme.pageInset,
  ]);

  const menuItems = [
    ...(settings.favorites.length
      ? [
          {
            label: "Suosikit",
            icon: "albums-outline",
            onPress: () => setFeed(true),
          },
        ]
      : []),
    {
      label: "Asetukset",
      icon: "settings-outline",
      onPress: () => navigation.navigate("Settings"),
    },
    {
      label: "Ohje",
      icon: "help-circle-outline",
      onPress: () => update({ onboardingDone: false }),
    },
  ];

  const pageArea = (
    <GestureRecognizer onSwipe={onSwipe} style={styles.pageArea}>
      <Pressable
        style={[styles.pageMeasure, isLandscape && styles.centered]}
        onLayout={(e) => setArea(e.nativeEvent.layout)}
        // The empty space around the page opens the keypad too, as in 2.4.
        onPress={() => !hasError && setKeypadOpen(true)}
        accessible={false}
      >
        {hasError ? (
          <ErrorPage
            page={error!.page}
            code={error!.code}
            width={pageSize.width}
            onRetry={() => fetchPage(error!.page, "1", true, true)}
            onHome={() => goTo("100")}
          />
        ) : (
          <PageView
            width={pageSize.width}
            height={pageSize.height}
            dimmed={showLoading || keypadOpen}
            onLinkPress={goTo}
            onPress={() => setKeypadOpen(true)}
          />
        )}
        {isLandscape ? <FastextTicks c={c} /> : <SubpageRow c={c} />}
      </Pressable>
    </GestureRecognizer>
  );

  const showGuide =
    loaded &&
    !settings.onboardingDone &&
    !keypadOpen &&
    !menuOpen &&
    !shareOpen &&
    !feed &&
    !!textTvResponse;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {theme.glass && settings.ambientGlow && <Ambient src={imgSrc} />}
      {isLandscape && !feed ? (
        <View style={styles.row}>
          <Rail c={c} />
          <View style={styles.flex}>
            <ProgressLine active={showLoading} />
            <NotFoundBand
              page={notFound}
              onClose={() => setNotFound(undefined)}
            />
            <StaleBanner
              savedAt={stale?.page === page ? stale.savedAt : undefined}
              onRetry={() => fetchPage(page, subPage, true)}
            />
            {pageArea}
          </View>
          {loaded && settings.showDock && <DockColumn onPageChange={goTo} />}
        </View>
      ) : (
        <>
          {feed ? (
            <>
              <FeedHeader
                onHome={() => {
                  setFeed(false);
                  goTo("100");
                }}
                onKeypad={() => setKeypadOpen(true)}
                onMenu={() => setMenuOpen(true)}
              />
              <FavoritesFeed onOpen={openFromFeed} />
            </>
          ) : (
            <>
              <Header c={c} />
              <ProgressLine active={showLoading} />
              <NotFoundBand
                page={notFound}
                onClose={() => setNotFound(undefined)}
              />
              <StaleBanner
                savedAt={stale?.page === page ? stale.savedAt : undefined}
                onRetry={() => fetchPage(page, subPage, true)}
              />
              {pageArea}
              <FastextRow c={c} />
              {loaded && settings.showDock && <Dock onPageChange={goTo} />}
            </>
          )}
        </>
      )}
      <Keypad
        visible={keypadOpen}
        recent={history.filter((p) => p !== page)}
        favorites={settings.favorites}
        onDigits={setDigits}
        onSubmit={(p) => {
          setFeed(false);
          goTo(p);
        }}
        onClose={() => setKeypadOpen(false)}
      />
      <ShareSheet
        visible={shareOpen}
        page={page}
        subPage={subPage}
        onClose={() => setShareOpen(false)}
      />
      <MoreMenu
        visible={menuOpen}
        items={menuItems}
        anchor={isLandscape ? "left" : "top"}
        onClose={() => setMenuOpen(false)}
      />
      {showGuide && (
        <Onboarding onDone={() => update({ onboardingDone: true })} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  flex: {
    flex: 1,
  },
  pageArea: {
    flex: 1,
  },
  pageMeasure: {
    flex: 1,
    alignItems: "center",
  },
  centered: {
    justifyContent: "center",
  },
});
