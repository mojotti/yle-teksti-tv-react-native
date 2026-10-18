import React, {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";

interface NavigationStatusContext {
  page: string;
  subPage: string;
  setPage: Dispatch<SetStateAction<string>>;
  setSubPage: Dispatch<SetStateAction<string>>;
  isLoadingImg: boolean;
  isLoadingPageData: boolean;
  setImgLoadingStatus: Dispatch<SetStateAction<boolean>>;
  setPageDataLoadingStatus: Dispatch<SetStateAction<boolean>>;
  /** Visited pages, oldest first, each page once. */
  history: string[];
  pushHistory: (page: string) => void;
  /** Drops the current page and returns the one before it, if any. */
  popHistory: () => string | undefined;
  /** Starts a new history from one page (e.g. a page opened from the feed). */
  resetHistory: (page: string) => void;
}

export const NavigationStatusContext = createContext(
  {} as NavigationStatusContext,
);

export const NavigationStatusProvider: React.FC<PropsWithChildren> = (
  props,
) => {
  const [page, setPage] = useState("100");
  const [subPage, setSubPage] = useState("1");
  const [isLoadingImg, setImgLoadingStatus] = useState(true);
  const [isLoadingPageData, setPageDataLoadingStatus] = useState(true);
  const historyRef = useRef<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const pushHistory = useCallback((p: string) => {
    historyRef.current = [
      ...historyRef.current.filter((x) => x !== p),
      p,
    ].slice(-30);
    setHistory(historyRef.current);
  }, []);

  const popHistory = useCallback(() => {
    historyRef.current = historyRef.current.slice(0, -1);
    setHistory(historyRef.current);
    return historyRef.current[historyRef.current.length - 1];
  }, []);

  const resetHistory = useCallback((p: string) => {
    historyRef.current = [p];
    setHistory(historyRef.current);
  }, []);

  return (
    <NavigationStatusContext.Provider
      value={{
        page,
        subPage,
        setPage,
        setSubPage,
        isLoadingPageData,
        isLoadingImg,
        setImgLoadingStatus,
        setPageDataLoadingStatus,
        history,
        pushHistory,
        popHistory,
        resetHistory,
      }}
    >
      {props.children}
    </NavigationStatusContext.Provider>
  );
};
