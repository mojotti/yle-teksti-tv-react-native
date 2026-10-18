import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getPageImgSrc, getPageJsonPath, getPageTitle } from "../utils";
import { mapTextTvResponse } from "../utils/mapper";
import { TextTvResponse } from "../types/response";
import { NavigationStatusContext } from "./navigation-status";
import { AppStateContext } from "./app-state";
import { SettingsContext } from "./settings";

export interface PageFetchError {
  page: string;
  code: number;
}

interface PageDetails {
  imgSrc?: string;
  textTvResponse?: TextTvResponse;
  error?: PageFetchError;
}

interface ContextItem extends PageDetails {
  fetchPage: (
    page: string,
    subPage: string,
    byPassCache?: boolean,
    setNewPage?: boolean,
  ) => Promise<PageDetails>;
  /** Loads a page into the cache without showing it. */
  prefetch: (page: string, subPage?: string) => void;
  /** Loads a page's metadata (title) and tells whether the page exists. */
  lookupPage: (page: string) => Promise<"ok" | "missing" | "error">;
  invalidateCache: () => void;
  /** Page titles seen so far ("Uutiset", "Urheilu"…), keyed by number. */
  pageNames: Record<string, string>;
}

type CacheItem = {
  imgSrc: string;
  textTvResponse: TextTvResponse;
  timestamp: number;
};

const CACHE_MS = 3 * 60 * 1000;
const PAGE_NAMES_KEY = "@pageNames";

export const PageContext = createContext({} as ContextItem);

const classifyError = (e: unknown): number => {
  const message = (e as Error)?.message?.toLowerCase() || "";

  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch")
  ) {
    return 503;
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return 504;
  }
  if (message.includes("abort")) {
    return 499;
  }
  if (message.includes("not found")) {
    return 404;
  }
  if (message.includes("unauthorized") || message.includes("forbidden")) {
    return 401;
  }
  return 418;
};

export const PageProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const cache = useRef<Record<string, CacheItem>>({});
  const requestId = useRef(0);
  const [imgSrc, setImgSrc] = useState<string>();
  const [error, setError] = useState<PageFetchError>();
  const [textTvResponse, setTextTvResponse] = useState<TextTvResponse>();
  const [pageNames, setPageNames] = useState<Record<string, string>>({});
  const [namesLoaded, setNamesLoaded] = useState(false);
  const backfilled = useRef(false);
  const { settings, loaded: settingsLoaded } = useContext(SettingsContext);

  const { addPageLoad } = useContext(AppStateContext);
  const { setPage, setSubPage, setPageDataLoadingStatus, setImgLoadingStatus } =
    useContext(NavigationStatusContext);

  useEffect(() => {
    AsyncStorage.getItem(PAGE_NAMES_KEY)
      .then((v) => v && setPageNames(JSON.parse(v)))
      .catch(() => {})
      .finally(() => setNamesLoaded(true));
  }, []);

  const rememberName = useCallback((response: TextTvResponse) => {
    const number = response.page.number;
    const name = getPageTitle(response);
    if (!name) {
      return;
    }
    setPageNames((names) => {
      if (names[number] === name) {
        return names;
      }
      const next = { ...names, [number]: name };
      AsyncStorage.setItem(PAGE_NAMES_KEY, JSON.stringify(next)).catch(
        () => {},
      );
      return next;
    });
  }, []);

  const getCached = (page: string, subPage: string) => {
    const item = cache.current[`${page}-${subPage}`];
    if (item && item.timestamp >= Date.now() - CACHE_MS) {
      return item;
    }
    return undefined;
  };

  const load = async (page: string, subPage: string): Promise<CacheItem> => {
    const response = await fetch(getPageJsonPath(page));

    if (response.status >= 400) {
      throw Object.assign(new Error("http"), { status: response.status });
    }

    const mapped = mapTextTvResponse(await response.json());
    const src = `${getPageImgSrc(mapped.page.number, subPage)}&cacheValid=${Date.now()}`;
    const item = { imgSrc: src, textTvResponse: mapped, timestamp: Date.now() };
    cache.current[`${page}-${subPage}`] = item;
    rememberName(mapped);
    return item;
  };

  const fetchPage = async (
    page: string,
    subPage: string,
    bypassCache?: boolean,
    setNewPage?: boolean,
  ): Promise<PageDetails> => {
    const id = ++requestId.current;
    setError(undefined);

    const show = (item: CacheItem) => {
      setImgSrc(item.imgSrc);
      setTextTvResponse(item.textTvResponse);
      if (setNewPage) {
        setPage(page);
        setSubPage("1");
      }
      setPageDataLoadingStatus(false);
      addPageLoad();
    };

    const cached = bypassCache ? undefined : getCached(page, subPage);

    if (cached) {
      show(cached);
      return { imgSrc: cached.imgSrc, textTvResponse: cached.textTvResponse };
    }

    setPageDataLoadingStatus(true);
    setImgLoadingStatus(true);

    try {
      const item = await load(page, subPage);
      if (id === requestId.current) {
        show(item);
      }
      return { imgSrc: item.imgSrc, textTvResponse: item.textTvResponse };
    } catch (e) {
      const code = (e as { status?: number }).status ?? classifyError(e);
      const fetchError = { page, code };
      if (id === requestId.current) {
        setError(fetchError);
        setPageDataLoadingStatus(false);
        setImgLoadingStatus(false);
      }
      return { error: fetchError };
    }
  };

  // Favourites saved before titles were remembered get theirs once,
  // one page at a time, shortly after start.
  useEffect(() => {
    if (!settingsLoaded || !namesLoaded || backfilled.current) {
      return;
    }
    backfilled.current = true;
    const missing = settings.favorites.filter((p) => !pageNames[p]);
    let cancelled = false;
    const t = setTimeout(async () => {
      for (const p of missing) {
        if (cancelled) {
          return;
        }
        await lookupPage(p);
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, namesLoaded]);

  const prefetch = (page: string, subPage = "1") => {
    if (getCached(page, subPage)) {
      return;
    }
    load(page, subPage)
      .then((item) => Image.prefetch(item.imgSrc))
      .catch(() => {});
  };

  const lookupPage = async (page: string) => {
    const cached = getCached(page, "1");
    if (cached) {
      rememberName(cached.textTvResponse);
      return "ok" as const;
    }
    try {
      await load(page, "1");
      return "ok" as const;
    } catch (e) {
      return (e as { status?: number }).status === 404
        ? ("missing" as const)
        : ("error" as const);
    }
  };

  const invalidateCache = () => {
    cache.current = {};
  };

  return (
    <PageContext.Provider
      value={{
        fetchPage,
        prefetch,
        lookupPage,
        invalidateCache,
        error,
        imgSrc,
        textTvResponse,
        pageNames,
      }}
    >
      {props.children}
    </PageContext.Provider>
  );
};
