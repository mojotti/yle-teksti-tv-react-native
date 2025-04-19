import React from "react";
import LottieView from "lottie-react-native";
import { StyleSheet } from "react-native";

export default class Loader extends React.PureComponent {
  render() {
    return (
      <LottieView
        source={require("../static/animations/loader.json")}
        autoPlay
        loop
        style={{ width: "100%", height: "100%" }}
      />
    );
  }
}
