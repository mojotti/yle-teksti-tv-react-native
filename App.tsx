import "react-native-gesture-handler";
import React, { FC } from "react";
import { PageHandler } from "./src/components/page-handler";
import { PageProvider } from "./src/providers/page";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { Settings } from "./src/components/settings";
import { SettingsProvider } from "./src/providers/settings";
import { AppStateProvider } from "./src/providers/app-state";
import { NavigationStatusProvider } from "./src/providers/navigation-status";
import { DeveloperPage } from "./src/components/developer-page";
import { WindowProvider } from "./src/providers/window";
import { Platform, SafeAreaView, StatusBar, View } from "react-native";
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import { iconSizeLarge, pageInfoHeight } from "./src/utils/constants";
import _IonIcon from "@react-native-vector-icons/ionicons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaInsetsContext,
} from "react-native-safe-area-context";

const Icon = _IonIcon as React.ElementType;

const App: FC = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
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

export default App;

export type RootStackParamList = {
  Home: undefined;
  Information: undefined;
  Settings: undefined;
  Development?: undefined;
};

export type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Home"
>;

const Navigator: FC = () => {
  const Stack = createStackNavigator();

  return (
    <SafeAreaInsetsContext.Consumer>
      {(insets) => (
        <View
          style={{
            flex: 1,
            backgroundColor: "black",
            paddingTop: Platform.OS === "android" ? insets?.top || 0 : 0,
            paddingBottom: Platform.OS === "android" ? insets?.bottom || 0 : 0,
          }}>
          <StatusBar barStyle={"light-content"} backgroundColor="#000000" />
          <Stack.Navigator initialRouteName="Home" detachInactiveScreens>
            <Stack.Screen
              name="Home"
              component={PageHandler}
              options={{
                title: "Teksti-TV",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Settings"
              component={Settings}
              options={{
                title: "Asetukset",
                headerShown: true,
                headerTitleAlign: "center",
                headerBackImage: (props) => (
                  <Icon
                    name={
                      Platform.OS === "ios"
                        ? "chevron-back-outline"
                        : "arrow-back-outline"
                    }
                    size={iconSizeLarge}
                    color={Platform.OS === "ios" ? props.tintColor : "#FFFFFF"}
                  />
                ),
                headerStyle: {
                  backgroundColor: "#1c1c1c",
                  height: pageInfoHeight,
                },
                headerTitleStyle: {
                  color: "#eeeeee",
                },
              }}
            />
            {__DEV__ && (
              <Stack.Screen
                name="Development"
                component={DeveloperPage}
                options={{
                  title: "Kehittäjäsivu",
                  headerShown: true,
                }}
              />
            )}
          </Stack.Navigator>
        </View>
      )}
    </SafeAreaInsetsContext.Consumer>
  );
};
