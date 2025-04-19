import React from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import { lightGray } from "../utils/colors";

export const ErrorScreen: React.FunctionComponent<{
  errorCode?: number;
  isKeyboardVisible: boolean;
}> = ({ errorCode, isKeyboardVisible }) => (
  <View
    style={{
      ...styles.container,
      ...(isKeyboardVisible ? styles.dimmed : {}),
    }}>
    <Text style={styles.sadFace}>:(</Text>
    <Text style={styles.text}>Voi ei!</Text>
    {errorCode === 418 ? (
      <Text style={styles.text}>
        Sivun hakeminen epäonnistui. Tarkista internet-yhteytesi.
      </Text>
    ) : (
      <Text style={styles.text}>
        Näyttää siltä, että Teksti TV:n taustajärjelmien kanssa on ongelmia.
      </Text>
    )}
    {errorCode && errorCode !== 418 && (
      <Text style={styles.text}>{`Virhekoodi: ${errorCode}`}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    height: "100%",
    padding: 16,
  },
  dimmed: {
    opacity: 0.2,
  },
  sadFace: {
    fontSize: 60,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    color: lightGray,
  },
  text: {
    fontSize: 18,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    marginTop: 30,
    color: lightGray,
    textAlign: "center",
  },
});
