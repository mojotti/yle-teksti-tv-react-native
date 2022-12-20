import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

export const Button: React.FC<{
  label: string;
  onPress: () => void;
  styles?: StyleProp<any>;
}> = (props) => (
  <TouchableOpacity
    style={{ ...styles.button, ...props.styles }}
    onPress={props.onPress}>
    <Text style={styles.text}>{props.label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: 4,
    backgroundColor: "#136f8a",
    display: "flex",
    flexDirection: "row",
    alignSelf: "flex-start",
  },
  text: {
    color: "#eeeeee",
    padding: 10,
    fontSize: 20,
    fontFamily: Platform.OS === "ios" ? undefined : "Roboto",
  },
});
