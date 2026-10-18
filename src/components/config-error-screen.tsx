import React from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
const lightGray = "#a7a7a7";

export const ConfigErrorScreen: React.FunctionComponent = () => (
  <View style={styles.container}>
    <Text style={styles.sadFace}>:(</Text>
    <Text style={styles.text}>Sovelluksen asetuksissa on virhe</Text>
    <Text style={styles.description}>
      Sovelluksen asetuksia ei voitu ladata.
    </Text>
    <Text style={styles.errorCode}>Virhekoodi: ENV_MISSING</Text>
    <Text style={styles.instruction}>
      Päivitä sovellus uusimpaan versioon tai ota yhteyttä kehittäjään.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
    padding: 24,
  },
  sadFace: {
    fontSize: 60,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    color: lightGray,
  },
  text: {
    fontSize: 20,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    marginTop: 30,
    color: lightGray,
    textAlign: "center",
    fontWeight: "bold",
  },
  description: {
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    marginTop: 20,
    color: lightGray,
    textAlign: "center",
    lineHeight: 24,
  },
  errorCode: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    marginTop: 30,
    color: lightGray,
    textAlign: "center",
    opacity: 0.7,
  },
  instruction: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    marginTop: 20,
    color: lightGray,
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 20,
  },
});
