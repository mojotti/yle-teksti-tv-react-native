/* eslint-env jest */
// Native modules the app touches, replaced for unit tests.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(() => Promise.resolve({ type: "wifi", isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));
jest.mock("@react-native-vector-icons/ionicons", () => {
  const { Text } = require("react-native");
  return ({ name }) => require("react").createElement(Text, null, `icon:${name}`);
});
jest.mock("react-native-view-shot", () => ({ captureRef: jest.fn() }));
jest.mock("react-native-share", () => ({ open: jest.fn() }));
jest.mock("@react-native-camera-roll/camera-roll", () => ({
  CameraRoll: { saveAsset: jest.fn() },
}));
jest.mock("@react-native-clipboard/clipboard", () => ({ setString: jest.fn() }));
jest.mock("react-native-in-app-review", () => ({
  isAvailable: () => false,
  RequestInAppReview: jest.fn(),
}));
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);
