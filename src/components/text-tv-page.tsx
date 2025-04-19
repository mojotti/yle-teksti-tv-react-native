import React, { useContext, useMemo, useState } from "react";
import { Image, StyleSheet, TextInput, View } from "react-native";

import Loader from "./animation";
import { ErrorScreen } from "./error-screen";
import { PageContext } from "../providers/page";
import { getScreenHeight } from "../utils";
import { SettingsContext } from "../providers/settings";
import { NavigationStatusContext } from "../providers/navigation-status";
import { OrientationTypes, WindowContext } from "../providers/window";

type TextTvPageProps = {
  isKeyboardVisible: boolean;
  onPageChange: (page: string) => void;
  setKeyboardVisibility: (isVisible: boolean) => void;
};

export const TextTVPage: React.FunctionComponent<TextTvPageProps> = (props) => {
  const [viewHeight, setViewHeight] = useState<number>(0);
  const [viewWidth, setViewWidth] = useState<number>(0);

  const { error, imgSrc } = useContext(PageContext);
  const { settings } = useContext(SettingsContext);

  const { page, isLoadingImg, isLoadingPageData, setImgLoadingStatus } =
    useContext(NavigationStatusContext);

  const { applicationWindow, orientation } = useContext(WindowContext);

  const { width, height } = applicationWindow;

  const onInputChange = (input: string) => {
    if (input.length === 3) {
      props.setKeyboardVisibility(false);
      props.onPageChange(input);
    }
  };

  const onLoad = () => {
    setImgLoadingStatus(false);
  };

  const onError = () => {
    setImgLoadingStatus(false);
  };

  const isLoading = isLoadingImg || isLoadingPageData || viewHeight === 0;

  const hasUnknownError = error && error.code !== 404;

  const isLandscape = orientation === OrientationTypes.Landscape;

  const pageWidth = viewWidth * 0.97;

  const pageHeight = useMemo(
    () =>
      getScreenHeight(settings.screenRatio, viewHeight, pageWidth, isLandscape),
    [settings.screenRatio, viewHeight, pageWidth, isLandscape],
  );

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        setViewHeight(event.nativeEvent.layout.height);
        setViewWidth(event.nativeEvent.layout.width);
      }}>
      <View
        style={{
          ...styles.container,
          ...styles.loadingContainer,
          height: "100%",
          width: "100%",
          position: "absolute",
          ...(isLoading && !hasUnknownError
            ? styles.displayFlex
            : styles.displayNone),
        }}>
        {isLoading && !hasUnknownError && <Loader />}
      </View>

      <View
        style={{
          ...styles.bgContainer,
          height: pageHeight,
          width: pageWidth,
          position: "relative",
          alignItems: "flex-start",
        }}>
        {!hasUnknownError && imgSrc && (
          <Image
            onLoad={onLoad}
            onLoadEnd={onLoad}
            onError={onError}
            source={{ uri: imgSrc }}
            resizeMode="stretch"
            style={
              props.isKeyboardVisible || isLoading
                ? {
                    ...styles.img,
                    opacity: isLoading ? 0.4 : 0.2,
                    width: pageWidth,
                    height: pageHeight,
                  }
                : {
                    ...styles.img,
                    height: pageHeight,
                    width: pageWidth,
                  }
            }
          />
        )}
        {props.isKeyboardVisible && (
          <TextInput
            autoFocus
            caretHidden
            placeholder={page || ""}
            placeholderTextColor={"rgba(0,0,0,0.4)"}
            maxLength={3}
            onChangeText={onInputChange}
            disableFullscreenUI
            returnKeyType="go"
            style={
              isLandscape
                ? {
                    ...styles.textInput,
                    height: height * 0.15,
                    width: viewWidth * 0.3,
                    top: height * 0.1,
                    left: viewWidth * 0.35,
                    fontSize: height * 0.06,
                  }
                : {
                    ...styles.textInput,
                    height: height * 0.15,
                    width: width * 0.3,
                    top: height * 0.15,
                    left: width * 0.35,
                    fontSize: height * 0.06,
                  }
            }
            keyboardType="number-pad"
            onSubmitEditing={() => props.setKeyboardVisibility(false)}
          />
        )}
        {hasUnknownError && (
          <ErrorScreen
            errorCode={error?.code}
            isKeyboardVisible={props.isKeyboardVisible}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },
  bgContainer: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  textInput: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    opacity: 1,
    zIndex: 1,
    textAlign: "center",
    borderRadius: 4,
    color: "#000000",
    overflow: "hidden",
  },
  displayNone: {
    display: "none",
  },
  displayFlex: {
    display: "flex",
  },
});
