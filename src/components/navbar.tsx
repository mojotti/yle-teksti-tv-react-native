import React, { PropsWithChildren } from "react";
import { infoAreaColor } from "../utils/colors";
import { View } from "react-native";

const gradient = `linear-gradient(to bottom, #2C3E50 5%, #000000 95%, ${infoAreaColor} 100%)`;

export const NavBar: React.FC<PropsWithChildren<{ style: any }>> = (props) => (
  <View pointerEvents="box-none">
    <View style={[props.style, { experimental_backgroundImage: gradient }]}>
      {props.children}
    </View>
  </View>
);
