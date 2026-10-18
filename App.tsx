import "react-native-gesture-handler";
import React, { FC } from "react";
import { Platform, StatusBar, View } from "react-native";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { PageProvider } from "./src/providers/page";
import { SettingsProvider } from "./src/providers/settings";
import { AppStateProvider } from "./src/providers/app-state";
import { NavigationStatusProvider } from "./src/providers/navigation-status";
import { WindowProvider } from "./src/providers/window";
import { hasValidEnvVariables } from "./src/utils";
import { ConfigErrorScreen } from "./src/components/config-error-screen";
import { SettingsHeader } from "./src/components/settings-header";
import { Home } from "./src/screens/home";
import { SettingsScreen } from "./src/screens/settings";
import { useTheme } from "./src/theme/theme";

const App: FC = () => {
  if (!hasValidEnvVariables()) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
        <SafeAreaProvider>
          <ConfigErrorScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <WindowProvider>
            <SettingsProvider>
              <NavigationStatusProvider>
                <PageProvider>
                  <NavigationContainer theme={DarkTheme}>
                    <Navigator />
                  </NavigationContainer>
                </PageProvider>
              </NavigationStatusProvider>
            </SettingsProvider>
          </WindowProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};

export type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Home"
>;

const Stack = createStackNavigator<RootStackParamList>();

const Navigator: FC = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {/* iOS: styled by the native root view controller. */}
      {Platform.OS === "android" && (
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
      )}
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ cardStyle: { backgroundColor: theme.bg } }}
      >
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            header: ({ navigation }) => (
              <SettingsHeader
                title="Asetukset"
                onBack={() => navigation.goBack()}
              />
            ),
          }}
        />
      </Stack.Navigator>
    </View>
  );
};
