import React, { PropsWithChildren } from "react";
import LinearGradient from "react-native-linear-gradient";
import { infoAreaColor } from "../utils/colors";
import { View } from "react-native";

export const NavBar: React.FC<PropsWithChildren<{ style: any }>> = (props) => (
  <View pointerEvents="box-none">
    <LinearGradient
      colors={["#2C3E50", "#000000", infoAreaColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      locations={[0.05, 0.95, 1]}
      style={props.style}>
      {props.children}
    </LinearGradient>
  </View>
);
