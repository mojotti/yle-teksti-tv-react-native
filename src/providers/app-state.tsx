import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import InAppReview from "react-native-in-app-review";

interface AppStateContext {
  appState: AppStateStatus;
  addPageLoad: () => void;
}

export const AppStateContext = createContext({} as AppStateContext);

const requestForReview = async (onDone: () => void) => {
  try {
    if (!InAppReview.isAvailable()) {
      onDone();
      return;
    }

    InAppReview.RequestInAppReview()
      .then((_review) => {
        Promise.all([
          AsyncStorage.setItem("@hasRatedApp", JSON.stringify(true)),
          AsyncStorage.setItem("@pageViews", JSON.stringify(0)),
        ]);
        onDone();
      })
      .catch((e) => {
        console.log("error while doing review", e);
        Promise.all([
          AsyncStorage.setItem("@hasRatedApp", JSON.stringify(true)),
          AsyncStorage.setItem("@pageViews", JSON.stringify(0)),
        ]);
        onDone();
      });
  } catch (e) {
    console.log("error in review!", e);
    Promise.all([
      AsyncStorage.setItem("@hasRatedApp", JSON.stringify(true)),
      AsyncStorage.setItem("@pageViews", JSON.stringify(0)),
    ]);
    onDone();
  }
};

export const AppStateProvider: FunctionComponent<PropsWithChildren> = (
  props,
) => {
  const appStateRef = useRef(AppState.currentState);
  const reviewRequestRef = useRef<boolean>(false);
  const [appState, setAppState] = useState<AppStateStatus>(appStateRef.current);
  const [listenerExists, setListenerExistence] = useState<boolean>(false);
  const [hasRatedApp, setRatedStatus] = useState<boolean>(false);

  useEffect(() => {
    if (!listenerExists) {
      AppState.addEventListener("change", handleAppStateChange);
      setListenerExistence(true);
    }

    (async () => {
      try {
        const hasRated = await AsyncStorage.getItem("@hasRatedApp");

        if (hasRated === null) {
          return;
        }

        setRatedStatus(JSON.parse(hasRated));
      } catch (e) {
        console.log("error while reading from local storage");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (reviewRequestRef.current || appStateRef.current === nextAppState) {
      return;
    }

    appStateRef.current = nextAppState;
    setAppState(appStateRef.current);
  };

  const addPageLoad = async () => {
    if (hasRatedApp) {
      return;
    }

    const numOfPageViews = await AsyncStorage.getItem("@pageViews");

    const views = numOfPageViews ? JSON.parse(numOfPageViews) : 0;

    if (views > 250) {
      reviewRequestRef.current = true;
      requestForReview(() => (reviewRequestRef.current = false));
    }

    try {
      await AsyncStorage.setItem("@pageViews", JSON.stringify(views + 1));
    } catch (e) {
      console.log("error while saving to local storage");
    }
  };

  return (
    <AppStateContext.Provider
      value={{
        addPageLoad,
        appState,
      }}>
      {props.children}
    </AppStateContext.Provider>
  );
};
