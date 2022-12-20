import React, { Component, PropsWithChildren } from "react";
import {
  View,
  PanResponder,
  PanResponderInstance,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";

export const swipeDirections = {
  SWIPE_UP: "SWIPE_UP",
  SWIPE_DOWN: "SWIPE_DOWN",
  SWIPE_LEFT: "SWIPE_LEFT",
  SWIPE_RIGHT: "SWIPE_RIGHT",
};

export type SwipeDirections =
  | "SWIPE_UP"
  | "SWIPE_DOWN"
  | "SWIPE_LEFT"
  | "SWIPE_RIGHT";

const swipeConfig = {
  velocityThreshold: 0.2,
  directionalOffsetThreshold: 200,
  gestureIsClickThreshold: 5,
};

type GestureRecognizerProps = {
  onSwipe: (...args: any[]) => any;
  style: any;
};

type GestureEvt = GestureResponderEvent;
type GestureState = PanResponderGestureState;

const isValidSwipe = (
  velocity: number,
  velocityThreshold: number,
  directionalOffset: number,
  directionalOffsetThreshold: number,
) => {
  return (
    Math.abs(velocity) > velocityThreshold &&
    Math.abs(directionalOffset) < directionalOffsetThreshold
  );
};

const isValidHorizontalSwipe = ({ vx, dy }: GestureState) => {
  const { velocityThreshold, directionalOffsetThreshold } = swipeConfig;
  return isValidSwipe(vx, velocityThreshold, dy, directionalOffsetThreshold);
};

const isValidVerticalSwipe = ({ dx, vy }: GestureState) => {
  const { velocityThreshold, directionalOffsetThreshold } = swipeConfig;
  return isValidSwipe(vy, velocityThreshold, dx, directionalOffsetThreshold);
};

const gestureIsClick = (gestureState: GestureState) => {
  return (
    Math.abs(gestureState.dx) < swipeConfig.gestureIsClickThreshold &&
    Math.abs(gestureState.dy) < swipeConfig.gestureIsClickThreshold
  );
};

const getSwipeDirection = (gestureState: GestureState) => {
  const { SWIPE_LEFT, SWIPE_RIGHT, SWIPE_UP, SWIPE_DOWN } = swipeDirections;
  const { dx, dy } = gestureState;

  if (Math.abs(dy) > Math.abs(dx) && isValidVerticalSwipe(gestureState)) {
    return dy > 0 ? SWIPE_DOWN : SWIPE_UP;
  } else if (
    Math.abs(dx) > Math.abs(dy) &&
    isValidHorizontalSwipe(gestureState)
  ) {
    return dx > 0 ? SWIPE_RIGHT : SWIPE_LEFT;
  }

  return null;
};

export class GestureRecognizer extends Component<
  PropsWithChildren<GestureRecognizerProps>
> {
  private panResponder: PanResponderInstance;

  constructor(props: GestureRecognizerProps) {
    super(props);

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this.handleShouldSetPanResponder,
      onMoveShouldSetPanResponder: this.handleShouldSetPanResponder,
      onPanResponderRelease: this.handlePanResponderEnd,
      onPanResponderTerminate: this.handlePanResponderEnd,
    });
  }

  handleShouldSetPanResponder = (
    evt: GestureEvt,
    gestureState: GestureState,
  ) => {
    return (
      evt.nativeEvent.touches.length === 1 && !gestureIsClick(gestureState)
    );
  };

  handlePanResponderEnd = (evt: GestureEvt, gestureState: GestureState) => {
    const swipeDirection = getSwipeDirection(gestureState);

    if (swipeDirection !== null) {
      this.triggerSwipeHandlers(swipeDirection, gestureState);
    }
  };

  triggerSwipeHandlers = (
    swipeDirection: string | null,
    gestureState: GestureState,
  ) => {
    const { onSwipe } = this.props;
    onSwipe && onSwipe(swipeDirection, gestureState);
  };

  render() {
    return <View {...this.props} {...this.panResponder.panHandlers} />;
  }
}
