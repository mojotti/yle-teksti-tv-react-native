import React, { useContext, useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { PageContext } from "../../providers/page";
import { NavigationStatusContext } from "../../providers/navigation-status";
import { SettingsContext } from "../../providers/settings";
import { isBlackListedPage, isValidPage } from "../../utils";
import { tt, useTheme } from "../../theme/theme";
import { Run } from "../../types/response";

const LINE_LENGTH = 40;

type LinkBox = {
  link: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Positions of the page-number links on the page, from the structured data. */
const useLinkBoxes = (width: number, height: number): LinkBox[] => {
  const { textTvResponse } = useContext(PageContext);
  const { subPage } = useContext(NavigationStatusContext);

  return useMemo(() => {
    if (
      !textTvResponse ||
      isBlackListedPage(textTvResponse.page.number) ||
      !width
    ) {
      return [];
    }
    const content = textTvResponse.page.subPages[
      Number(subPage) - 1
    ]?.content?.find((c) => c.type === "structured");
    const lines = content?.line ?? [];
    const rowHeight = height / (lines.length || 1);
    const linkWidth = width * (3 / LINE_LENGTH);
    const boxes: LinkBox[] = [];

    lines.forEach((line, row) => {
      let position = 0;
      (line.run ?? []).forEach((run: Run) => {
        position += Number(run.length);
        if (run.link && isValidPage(run.link)) {
          boxes.push({
            link: run.link,
            top: rowHeight * row,
            left: width * (position / LINE_LENGTH) - linkWidth,
            width: linkWidth,
            height: rowHeight,
          });
        }
      });
    });
    return boxes;
  }, [textTvResponse, subPage, width, height]);
};

export const PageView: React.FC<{
  width: number;
  height: number;
  dimmed: boolean;
  onLinkPress: (page: string) => void;
  onPress: () => void;
}> = ({ width, height, dimmed, onLinkPress, onPress }) => {
  const theme = useTheme();
  const { imgSrc } = useContext(PageContext);
  const { setImgLoadingStatus } = useContext(NavigationStatusContext);
  const { settings } = useContext(SettingsContext);
  const boxes = useLinkBoxes(width, height);

  if (!width || !height) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Teksti-TV-sivu. Napauta avataksesi numeronäppäimistön."
      style={[
        { width, height, borderRadius: theme.radius.page },
        theme.glass && styles.glassShadow,
      ]}
    >
      <View
        style={[
          styles.page,
          {
            width,
            height,
            borderRadius: theme.radius.page,
            borderColor: theme.glass ? "rgba(255,255,255,0.1)" : "transparent",
          },
        ]}
      >
        {imgSrc ? (
          <Image
            source={{ uri: imgSrc }}
            resizeMode="stretch"
            onLoadEnd={() => setImgLoadingStatus(false)}
            style={{ width, height, opacity: dimmed ? 0.35 : 1 }}
          />
        ) : null}
        {settings.pageLinks && !dimmed && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {boxes.map((b, i) => (
              <Pressable
                key={`${i}-${b.link}`}
                onPress={() => onLinkPress(b.link)}
                accessibilityRole="link"
                accessibilityLabel={`Sivu ${b.link}`}
                style={[
                  styles.link,
                  {
                    top: b.top,
                    left: b.left,
                    width: b.width,
                    height: b.height,
                  },
                  settings.highlightScreenLinks && styles.highlight,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  page: {
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: StyleSheet.hairlineWidth,
  },
  glassShadow: {
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  link: {
    position: "absolute",
  },
  highlight: {
    borderWidth: 1.5,
    borderColor: tt.yellow,
    borderRadius: 2,
  },
});
