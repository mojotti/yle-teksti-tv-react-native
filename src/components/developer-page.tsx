import React, { useContext } from "react";
import { Platform, ScrollView, StyleSheet, Text } from "react-native";
import { lightGray } from "../utils/colors";
import { Divider } from "./divider";
import { SettingsContext } from "../providers/settings";
import { BackNavigationHOC } from "./back-navigation-hoc";
import { PageContext } from "../providers/page";
import { NavigationStatusContext } from "../providers/navigation-status";
import { AppStateContext } from "../providers/app-state";

export const DeveloperPage = () => {
  const { settings } = useContext(SettingsContext);

  const { imgSrc, textTvResponse, error } = useContext(PageContext);
  const { page, subPage } = useContext(NavigationStatusContext);
  const { appState } = useContext(AppStateContext);

  return (
    <BackNavigationHOC>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{`settings`}</Text>

        <Text style={{ ...styles.body, ...styles.marginBottom }}>
          {JSON.stringify(settings, null, 2)}
        </Text>

        <Divider />

        <Text style={styles.title}>{`imgSrc`}</Text>

        <Text style={{ ...styles.body, ...styles.marginBottom }}>
          {JSON.stringify(imgSrc?.split("?")[0], null, 2)}
        </Text>

        <Divider />

        <Text style={styles.title}>{`error`}</Text>

        <Text style={{ ...styles.body, ...styles.marginBottom }}>
          {JSON.stringify(error, null, 2)}
        </Text>

        <Divider />

        <Text style={styles.title}>{`page`}</Text>

        <Text style={{ ...styles.body, ...styles.marginBottom }}>
          {JSON.stringify(page, null, 2)}
        </Text>

        <Divider />

        <Text style={styles.title}>{`subPage`}</Text>

        <Text style={{ ...styles.body, ...styles.marginBottom }}>
          {JSON.stringify(subPage, null, 2)}
        </Text>

        <Divider />

        <Text style={styles.title}>{`appState`}</Text>

        <Text style={{ ...styles.body, ...styles.marginBottom }}>
          {JSON.stringify(appState, null, 2)}
        </Text>

        <Divider />

        <Text style={styles.title}>{`textTvResponse`}</Text>

        <Text style={{ ...styles.body, ...styles.marginBottom }}>
          {JSON.stringify(textTvResponse, null, 2)}
        </Text>
      </ScrollView>
    </BackNavigationHOC>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  title: {
    fontFamily: Platform.OS === "ios" ? undefined : "sans-serif-thin",
    fontSize: 35,
    color: lightGray,
    marginBottom: 30,
  },
  body: {
    fontFamily: Platform.OS === "ios" ? undefined : "Roboto",
    fontSize: 20,
    color: lightGray,
  },
  marginBottom: {
    marginBottom: 20,
  },
});
