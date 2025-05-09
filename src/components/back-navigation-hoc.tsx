import React, { PropsWithChildren, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { BackHandler } from "react-native";
import { HomeScreenNavigationProp } from "../../App";

export const BackNavigationHOC: React.FC<PropsWithChildren> = (props) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  useEffect(() => {
    const onBackPress = () => {
      if (navigation.isFocused()) {
        navigation.navigate("Home");
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, []);

  return <>{props.children}</>;
};
