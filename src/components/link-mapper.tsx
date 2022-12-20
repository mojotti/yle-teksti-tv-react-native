import React, {
  FunctionComponent,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import { Run, TextTVSubPageContent } from "../types/response";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  getScreenHeight,
  isBlackListedPage,
  isDefined,
  isValidPage,
} from "../utils";
import { SettingsContext } from "../providers/settings";
import { NavigationStatusContext } from "../providers/navigation-status";
import { PageContext } from "../providers/page";
import { OrientationTypes, WindowContext } from "../providers/window";

type RunWithPosition = { run: Run; positionHorizontal: number };

const formatLines = (runs?: Run[]): RunWithPosition[] | undefined => {
  if (!runs) {
    return undefined;
  }

  let mutablePositionOnLine = 0;

  return runs
    .map((run) => {
      mutablePositionOnLine = mutablePositionOnLine + Number(run.length);

      if (isValidPage(run.link || "")) {
        return {
          run,
          positionHorizontal: mutablePositionOnLine,
        };
      } else {
        return undefined;
      }
    })
    .filter(isDefined);
};

const lineLength = 40;

type LinksProps = {
  highlightLinks: boolean;
  linkContent?: TextTVSubPageContent;
  onPageChange: (page: string) => void;
  rowHeight: number;
  viewWidth: number;
};

const Links = (props: LinksProps) => {
  const width = props.viewWidth * 0.97;

  return (
    <>
      {props.linkContent?.line.map((line, index) => {
        return formatLines(line.run)?.map((runWithPosition, j) => {
          const { run, positionHorizontal } = runWithPosition;
          const linkWidth = width * (3 / lineLength);

          const highlightStyle = props.highlightLinks
            ? { backgroundColor: "rgba(246, 151, 249, 0.28)" }
            : {};

          return (
            <TouchableOpacity
              onPress={() => {
                if (run.link) props.onPageChange(run.link);
              }}
              style={{
                ...styles.grid,
                ...highlightStyle,
                height: props.rowHeight,
                width: linkWidth,
                top: props.rowHeight * index,
                left: width * (positionHorizontal / lineLength) - linkWidth,
                zIndex: 1000,
              }}
              key={`${index}-${j}`}
            />
          );
        });
      })}
    </>
  );
};

const MemoizedLinks = React.memo(Links);

export const LinkMapper: FunctionComponent<
  PropsWithChildren<{
    onPageChange: (page: string) => void;
    isKeyboardVisible: boolean;
  }>
> = (props) => {
  const [viewHeight, setViewHeight] = useState<number>(0);
  const [viewWidth, setViewWidth] = useState<number>(0);

  const { settings } = useContext(SettingsContext);
  const { isLoadingImg, isLoadingPageData, subPage } = useContext(
    NavigationStatusContext,
  );

  const { textTvResponse } = useContext(PageContext);
  const { orientation } = useContext(WindowContext);

  const isLandscape = orientation === OrientationTypes.Landscape;

  const isLoading = isLoadingImg || isLoadingPageData;

  const screenHeight = useMemo(
    () =>
      getScreenHeight(
        settings.screenRatio,
        viewHeight,
        viewWidth * 0.97,
        isLandscape,
      ),
    [viewHeight, settings, viewWidth, isLandscape],
  );

  if (!textTvResponse || isBlackListedPage(textTvResponse.page.number)) {
    return <>{props.children}</>;
  }

  const subPageNum = Number(subPage) - 1;

  const linkContent = textTvResponse?.page.subPages[subPageNum]?.content?.find(
    (c) => c.type === "structured",
  );
  const numOfLines = linkContent?.line?.length || 1;

  const rowHeight = screenHeight / numOfLines;

  return (
    <View
      onLayout={(event) => {
        setViewHeight(event.nativeEvent.layout.height);
        setViewWidth(event.nativeEvent.layout.width);
      }}>
      {!props.isKeyboardVisible && (
        <MemoizedLinks
          highlightLinks={settings.highlightScreenLinks && !isLoading}
          onPageChange={props.onPageChange}
          rowHeight={rowHeight}
          linkContent={linkContent}
          viewWidth={viewWidth}
        />
      )}
      {props.children}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    position: "absolute",
  },
});
