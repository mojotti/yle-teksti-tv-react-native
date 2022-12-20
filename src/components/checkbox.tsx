import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";

import { acceptedBlue, lightGray } from "../utils/colors";
import CheckBox from "@react-native-community/checkbox";

export const CheckBoxCmp: React.FC<{
  isEnabled: boolean;
  label: string;
  onPress: () => void;
}> = ({ isEnabled, label, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <CheckBox
        disabled={true}
        value={isEnabled}
        onValueChange={onPress}
        tintColors={{ true: acceptedBlue, false: "#FFFFFF" }}
      />
      <Text
        style={{
          ...styles.body,
          paddingLeft: 20,
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginVertical: 4,
  },
  switch: {
    flex: 1,
    justifyContent: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  body: {
    fontFamily: Platform.OS === "ios" ? undefined : "Roboto",
    fontSize: 20,
    color: lightGray,
  },
});
