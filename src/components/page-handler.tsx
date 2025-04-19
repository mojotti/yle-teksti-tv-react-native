import React, {
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigation } from "@react-navigation/native";
import {
  Alert,
  BackHandler,
  Platform,
  ToastAndroid,
  TouchableHighlight,
  View,
} from "react-native";

import { TextTVPage } from "./text-tv-page";
import { getNewSubPage, isValidPage } from "../utils";

import {
  GestureRecognizer,
  SwipeDirections,
  swipeDirections,
} from "./gesture-recognizer";
import { LinksBar } from "./links-bar";
import { PageContext } from "../providers/page";
import { LinkMapper } from "./link-mapper";
import { HomeScreenNavigationProp } from "../../App";
import { AppStateContext } from "../providers/app-state";
import { NavigationStatusContext } from "../providers/navigation-status";
import { OrientationTypes, WindowContext } from "../providers/window";
import { linkAreaHeight, linkAreaLandscapeWidth } from "../utils/constants";
import { TextTvPageNavBar } from "./text-tv-page-navbar";

export const PageHandler: React.FunctionComponent = () => {
  const [isKeyboardVisible, setKeyboardVisibility] = useState<boolean>(false);
  const { fetchPage, error, invalidateCache, textTvResponse } =
    useContext(PageContext);

  const {
    page: currentPage,
    subPage: currentSubPage,
    setSubPage,
  } = useContext(NavigationStatusContext);

  const historyRef = useRef<string[]>([]);

  const navigation = useNavigation<HomeScreenNavigationProp>();

  const { appState } = useContext(AppStateContext);

  useEffect(() => {
    if (appState === "active") {
      invalidateCache();
      fetchPage(currentPage, currentSubPage, true, false);
      // historyRef.current = [currentPage];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  useEffect(() => {
    historyRef.current = [
      ...new Set(historyRef.current.filter((page) => page !== currentPage)),
      currentPage,
    ];
  }, [currentPage]);

  const toHomePage = useCallback(() => {
    if (historyRef.current.length === 0 || !navigation.isFocused()) {
      return false;
    }

    if (historyRef.current.length === 1) {
      if (historyRef.current[0] === "100") {
        return false;
      }

      fetchPage("100", "1", false, true);
      historyRef.current = [];

      return true;
    }

    historyRef.current = historyRef.current.slice(0, -1);
    const prevPage = historyRef.current[historyRef.current.length - 1];

    fetchPage(prevPage, "1", false, true);

    return true;
  }, [fetchPage, navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      toHomePage,
    );

    return () => backHandler.remove();
  }, [toHomePage]);

  useEffect(() => {
    if (error?.code === 404) {
      const msg = `📺👀 Sivua ${error.page} ei löydy.`;

      Platform.OS === "android"
        ? ToastAndroid.showWithGravity(
            msg,
            ToastAndroid.SHORT,
            ToastAndroid.CENTER,
          )
        : Alert.alert(msg);
    }
  }, [error]);

  const refreshPage = async () => {
    if (currentPage && currentSubPage) {
      await fetchPage(currentPage, currentSubPage, true);
    }
  };

  const onPageChange = (pageNumber: string) => {
    if (!isValidPage(pageNumber)) {
      return;
    }

    fetchPage(pageNumber, "1", false, true);
  };

  const changeSubPage = (direction: "next" | "back", sub?: string) => {
    const maxSubPage = textTvResponse?.page.subPageCount;

    if (!maxSubPage) {
      return;
    }

    const newSubPage =
      sub ||
      getNewSubPage(Number(currentSubPage), Number(maxSubPage), direction);

    if (!newSubPage) {
      return;
    }

    fetchPage(currentPage, String(newSubPage));
    setSubPage(String(newSubPage));
  };

  const changePage = (direction: "next" | "back") => {
    if (direction === "back") {
      if (!textTvResponse?.page.prevPage) {
        return;
      }

      onPageChange(textTvResponse?.page.prevPage);
    } else {
      if (!textTvResponse?.page.nextPage) {
        return;
      }

      onPageChange(textTvResponse.page.nextPage);
    }
  };

  const onSwipe = (gestureName: SwipeDirections) => {
    if (error && error.code !== 404) {
      return;
    }

    const { SWIPE_UP, SWIPE_DOWN, SWIPE_LEFT, SWIPE_RIGHT } = swipeDirections;

    switch (gestureName) {
      case SWIPE_LEFT:
        changePage("next");
        break;
      case SWIPE_RIGHT:
        changePage("back");
        break;
      case SWIPE_UP:
        changeSubPage("next");
        break;
      case SWIPE_DOWN:
        changeSubPage("back");
        break;
    }
  };

  const { orientation } = useContext(WindowContext);

  const isLandscape = orientation === OrientationTypes.Landscape;

  return (
    <Container isLandscape={isLandscape}>
      <TextTvPageNavBar
        isKeyboardVisible={isKeyboardVisible}
        refreshPage={refreshPage}
        setKeyboardVisibility={setKeyboardVisibility}
        subPageMax={textTvResponse?.page.subPageCount || "1"}
        onBackPress={toHomePage}
      />
      <GestureRecognizer
        onSwipe={onSwipe}
        style={{ flex: 1, position: "relative" }}>
        <TouchableHighlight
          onPress={() => setKeyboardVisibility(!isKeyboardVisible)}
          style={{
            flex: 1,
            position: "relative",
          }}>
          <LinkMapper
            onPageChange={onPageChange}
            isKeyboardVisible={isKeyboardVisible}>
            <TextTVPage
              onPageChange={onPageChange}
              isKeyboardVisible={isKeyboardVisible}
              setKeyboardVisibility={setKeyboardVisibility}
            />
          </LinkMapper>
        </TouchableHighlight>
      </GestureRecognizer>

      {(isLandscape || !isKeyboardVisible) && (
        <>
          <View
            style={{
              height: isLandscape ? "100%" : linkAreaHeight,
              width: isLandscape ? linkAreaLandscapeWidth : "100%",
            }}>
            {!(error && error.code !== 404) ? (
              <LinksBar onPageChange={onPageChange} />
            ) : (
              <View style={{ flex: 1, backgroundColor: "#000000" }} />
            )}
          </View>
        </>
      )}
    </Container>
  );
};

const Container: FC<PropsWithChildren<{ isLandscape: boolean }>> = ({
  children,
  isLandscape,
}) => (
  <View style={{ display: "flex", flex: 1, backgroundColor: "black" }}>
    {isLandscape && (
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
        }}>
        {children}
      </View>
    )}
    {!isLandscape && <>{children}</>}
  </View>
);
