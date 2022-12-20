import React from "react";
import {
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { lightGray } from "../utils/colors";

export const SwitchCmp: React.FC<{
  isEnabled: boolean;
  label: string;
  onPress: () => void;
}> = ({ isEnabled, label, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text
        style={{
          ...styles.body,
          paddingRight: 20,
        }}>
        {label}
      </Text>
      <View style={styles.switch}>
        <Switch
          trackColor={{ false: "#8c8c8c", true: "#2770ff" }}
          ios_backgroundColor={"#949494"}
          value={isEnabled}
          disabled
          onValueChange={onPress}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
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
