import React, {
  FC,
  FunctionComponent,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

import { infoAreaColor, lightGray, linkColor } from "../utils/colors";
import { getLinkPages } from "../utils";
import { NavigationStatusContext } from "../providers/navigation-status";
import { PageContext } from "../providers/page";
import { SettingsContext } from "../providers/settings";
import Icon from "react-native-vector-icons/Ionicons";
import { OrientationTypes, WindowContext } from "../providers/window";
import {
  fontSizeLarge,
  fontSizeMedium,
  iconSizeLarge,
  iconSizeMedium,
  iconSizeSmall,
} from "../utils/constants";
import { useNavigation } from "@react-navigation/native";
import { HomeScreenNavigationProp } from "../../App";

const validPositiveNumber = (number: any): number => {
  const n = Number(number);

  if (!n || n <= 0.1 || isNaN(n)) {
    return 1;
  }

  return n;
};

const UnmemoizedLinksBar: FunctionComponent<{
  onPageChange: (page: string) => void;
}> = (props) => {
  const [scrollView, setScrollView] = useState<ScrollView>();

  const [completeScrollBarWidth, setCompleteScrollBarWidth] = useState(1);
  const [linkBarWidth, setLinkBarWidth] = useState(0);
  const [menuWidth, setMenuWidth] = useState<number>(0);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  const { isLoadingPageData, page, subPage } = useContext(
    NavigationStatusContext,
  );
  const { textTvResponse } = useContext(PageContext);
  const { settings } = useContext(SettingsContext);

  const { applicationWindow, orientation } = useContext(WindowContext);

  const { width: screenWidth } = applicationWindow;
  const width = screenWidth - menuWidth;

  const isLandscape = orientation === OrientationTypes.Landscape;

  const generatedLinks = useMemo(
    () =>
      isLoadingPageData ? [] : getLinkPages(page, subPage, textTvResponse),
    [isLoadingPageData, page, subPage, textTvResponse],
  );

  const hasFavorites = settings.favorites.length > 0;

  const links = hasFavorites ? settings.favorites : generatedLinks;

  useEffect(
    () => scrollView?.scrollTo({ x: 0, y: 0, animated: false }),
    [links, scrollView, settings.favorites],
  );

  React.useEffect(() => {
    scaleAnim.setValue(0);

    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.ease,
    }).start();
  }, [scaleAnim, links]);

  const diff = validPositiveNumber(width - linkBarWidth);

  return (
    <View style={styles.linksBarContainer}>
      {!isLandscape && (
        <View style={styles.headerContainer}>
          <Animated.Text
            onLayout={(event: any) =>
              setLinkBarWidth(event.nativeEvent.layout.width)
            }
            style={{
              ...styles.text,
              transform: [
                {
                  translateX: Animated.multiply(
                    scrollX,
                    validPositiveNumber(
                      (width - linkBarWidth) / (completeScrollBarWidth - width),
                    ),
                  ).interpolate({
                    inputRange: [0, diff],
                    outputRange: [0, diff],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}>
            {hasFavorites ? "Suosikkisivut" : "Sivun linkit"}
          </Animated.Text>
        </View>
      )}
      <ScrollContainer
        isLandscape={isLandscape}
        scrollX={scrollX}
        setCompleteScrollBarWidth={setCompleteScrollBarWidth}
        setScrollView={setScrollView}
        setMenuWidth={setMenuWidth}
        hasFavorites={hasFavorites}
        width={screenWidth}>
        {links.map((link) => (
          <TouchableOpacity key={link} onPress={() => props.onPageChange(link)}>
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              locations={[0, 0.97]}
              colors={["#2b5876", "#4e4376"]}
              style={{
                ...styles.linkContainer,
                marginVertical: isLandscape ? 10 : 0,
              }}>
              {hasFavorites && settings.favoriteIcon !== "none" && (
                <Icon
                  style={styles.icon}
                  name={
                    settings.favoriteIcon === "heart"
                      ? "heart-outline"
                      : "star-outline"
                  }
                  size={isLandscape ? iconSizeSmall : iconSizeMedium}
                  color="#FFFFFF"
                />
              )}
              <Animated.Text
                style={{
                  ...styles.link,
                  fontSize:
                    isLandscape && hasFavorites
                      ? fontSizeMedium
                      : fontSizeLarge,
                  opacity: scaleAnim,
                  transform: [{ scale: scaleAnim }],
                }}>
                {link}
              </Animated.Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollContainer>
    </View>
  );
};

export const LinksBar = React.memo(UnmemoizedLinksBar);

const ScrollContainer: FC<
  PropsWithChildren<{
    hasFavorites: boolean;
    isLandscape: boolean;
    width: number;
    setScrollView: React.Dispatch<React.SetStateAction<ScrollView | undefined>>;
    setCompleteScrollBarWidth: React.Dispatch<React.SetStateAction<number>>;
    setMenuWidth: (width: number) => void;
    scrollX: Animated.Value;
  }>
> = ({
  children,
  hasFavorites,
  isLandscape,
  width,
  setCompleteScrollBarWidth,
  setScrollView,
  setMenuWidth,
  scrollX,
}) => {
  return (
    <>
      {isLandscape && (
        <View
          style={{
            ...styles.links,
            width: "100%",
            flex: 1,
            flexDirection: "column",
          }}>
          <Menu isLandscape={isLandscape} setMenuWidth={setMenuWidth} />
          {isLandscape && (
            <View style={styles.headerContainerLandscape}>
              <Text style={styles.textLandscape}>
                {hasFavorites ? "Suosikit" : "Sivun linkit"}
              </Text>
            </View>
          )}
          <ScrollView
            horizontal={false}
            style={{
              display: "flex",
              flexDirection: "column",
            }}
            contentContainerStyle={{
              ...styles.container,
              flexDirection: "column",
            }}
            showsVerticalScrollIndicator
            ref={(ref) => ref && setScrollView(ref)}>
            {children}
          </ScrollView>
        </View>
      )}
      {!isLandscape && (
        <View
          style={{
            ...styles.links,
            display: "flex",
            flexDirection: "row",
            paddingVertical: 10,
            width,
          }}>
          <ScrollView
            horizontal
            ref={(ref) => ref && setScrollView(ref)}
            contentContainerStyle={{
              ...styles.container,
            }}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={isLandscape}
            onContentSizeChange={(width) => {
              setCompleteScrollBarWidth(width);
            }}
            onScroll={Animated.event(
              [
                {
                  nativeEvent: {
                    contentOffset: {
                      x: scrollX,
                    },
                  },
                },
              ],
              { useNativeDriver: false },
            )}
            scrollEventThrottle={10}>
            {children}
          </ScrollView>
          <Menu isLandscape={isLandscape} setMenuWidth={setMenuWidth} />
        </View>
      )}
    </>
  );
};

const Menu: FC<{
  isLandscape: boolean;
  setMenuWidth: (width: number) => void;
}> = ({ isLandscape, setMenuWidth }) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <TouchableOpacity
      onLayout={(event) => setMenuWidth(event.nativeEvent.layout.width)}
      onPress={() => navigation.navigate("Settings")}
      style={{
        marginRight: isLandscape ? 0 : 0,
        marginVertical: isLandscape ? 5 : 0,
        borderLeftWidth: isLandscape ? 0 : 1.5,
        borderLeftColor: isLandscape ? "transparent" : "rgba(96,96,96,0.4)",
        borderBottomWidth: isLandscape ? 1 : 0,
        borderBottomColor: isLandscape ? "rgba(96,96,96,0.4)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <Icon
        style={{
          ...styles.menu,
          paddingLeft: isLandscape ? 10 : 10,
          paddingRight: isLandscape ? 10 : 10,
          paddingTop: isLandscape ? 0 : 6,
          paddingBottom: isLandscape ? 10 : 6,
        }}
        name={"cog-outline"}
        size={iconSizeLarge}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  linksBarContainer: {
    display: "flex",
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: infoAreaColor,
  },
  links: {
    backgroundColor: infoAreaColor,
  },
  linkContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: linkColor,
    borderRadius: 10,
    overflow: "hidden",
    marginHorizontal: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  link: {
    color: "#FFFFFF",
    height: "100%",
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
  },
  icon: {
    marginRight: 2,
    alignSelf: "center",
  },
  text: {
    fontFamily: Platform.OS === "ios" ? undefined : "Roboto",
    fontSize: 14,
    lineHeight: 14,
    color: lightGray,
    backgroundColor: infoAreaColor,
    paddingHorizontal: 7,
    paddingTop: 5,
    borderRadius: 6,
    paddingBottom: 2,
    overflow: "hidden",
    position: "absolute",
  },
  headerContainer: {
    height: 19,
    display: "flex",
    flexDirection: "row",
    transform: [{ translateY: 2 }],
    position: "relative",
  },
  headerContainerLandscape: {
    height: "auto",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    backgroundColor: infoAreaColor,
  },
  textLandscape: {
    fontFamily: Platform.OS === "ios" ? undefined : "Roboto",
    fontSize: 14,
    lineHeight: 14,
    color: lightGray,
    paddingVertical: 4,
  },
  menu: {
    alignSelf: "center",
  },
});
