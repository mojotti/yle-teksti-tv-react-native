import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { IconButton } from "./ui";
import { useTheme } from "../theme/theme";

export const SettingsHeader: React.FC<{
  title: string;
  onBack: () => void;
}> = ({ title, onBack }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.glass ? theme.bg : theme.chrome,
          borderBottomColor: theme.chromeBorder,
        },
      ]}
    >
      <IconButton
        name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
        label="Takaisin"
        onPress={onBack}
      />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
  },
  spacer: {
    width: 38,
  },
});
