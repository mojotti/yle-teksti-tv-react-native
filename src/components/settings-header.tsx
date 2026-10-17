import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import _IonIcon from "@react-native-vector-icons/ionicons";
import {
  fontSizeMedium,
  iconSizeLarge,
  pageInfoHeight,
} from "../utils/constants";

const Icon = _IonIcon as React.ElementType;

export const SettingsHeader: React.FC<{
  title?: string;
  onBack?: () => void;
}> = ({ title = "Asetukset", onBack }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.left}>
        <Icon
          name={
            Platform.OS === "ios"
              ? "chevron-back-outline"
              : "arrow-back-outline"
          }
          size={iconSizeLarge}
          color="#FFFFFF"
        />
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {/* Right spacer keeps title perfectly centered horizontally */}
      <View style={styles.rightSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: pageInfoHeight,
    backgroundColor: "#1c1c1c",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  left: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rightSpacer: {
    width: iconSizeLarge,
  },
  title: {
    color: "#eeeeee",
    fontSize: fontSizeMedium,
    fontWeight: Platform.OS === "ios" ? "600" : "bold",
  },
});
