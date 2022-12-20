import React from "react";
import { StyleSheet, View } from "react-native";
import { lightGray } from "../utils/colors";

export const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  divider: {
    borderBottomColor: lightGray,
    borderBottomWidth: 1,
    marginVertical: 25,
  },
});
