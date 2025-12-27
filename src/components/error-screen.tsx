import React from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import { lightGray } from "../utils/colors";

const getErrorMessage = (errorCode?: number): string => {
  switch (errorCode) {
    case 401:
      return 'API-todennuksessa on ongelma. Päivitä sovellus tai ota yhteyttä kehittäjään.';
    case 404:
      return 'Sivua ei löydy. Tarkista sivunumero.';
    case 499:
      return 'Sivun lataus keskeytettiin.';
    case 503:
      return 'Ei internet-yhteyttä. Tarkista verkkoasetuksesi.';
    case 504:
      return 'Yhteys aikakatkaistiin. Yritä uudelleen.';
    case 418:
      return 'Sivun hakeminen epäonnistui. Yritä uudelleen.';
    default:
      return 'Näyttää siltä, että Teksti TV:n taustajärjelmien kanssa on ongelmia.';
  }
};

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
    <Text style={styles.text}>{getErrorMessage(errorCode)}</Text>
    {errorCode && (
      <Text style={styles.errorCode}>{`Virhekoodi: ${errorCode}`}</Text>
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
  errorCode: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    marginTop: 20,
    color: lightGray,
    textAlign: "center",
    opacity: 0.7,
  },
});
