import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useContext,
  useState,
} from "react";

import { getPageImgSrc, getPageJsonPath } from "../utils";
import { mapTextTvResponse } from "../utils/mapper";
import { TextTvResponse } from "../types/response";
import { NavigationStatusContext } from "./navigation-status";
import { AppStateContext } from "./app-state";

interface PageFetchError {
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
  invalidateCache: () => void;
}

type CacheItem = {
  imgSrc: string;
  textTvResponse: TextTvResponse;
  timestamp: number;
};

export const PageContext = createContext({} as ContextItem);

type PageCacheType = Record<string, CacheItem>;

export const PageProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [cache, setCache] = useState<PageCacheType>({});
  const [imgSrc, setImgSrc] = useState<string>();
  const [error, setErrorCode] = useState<PageFetchError>();

  const { addPageLoad } = useContext(AppStateContext);
  const { setPage, setSubPage, setPageDataLoadingStatus, setImgLoadingStatus } =
    useContext(NavigationStatusContext);

  const [textTvResponse, setTextTvResponse] = useState<TextTvResponse>();

  const getCachedValue = (page: string, subPage: string) => {
    const cacheKey = `${page}-${subPage}`;

    const cachedValue = cache[cacheKey];
    const validCacheTimestamp = +new Date() - 3 * 60 * 1000;

    if (cachedValue && cachedValue.timestamp >= validCacheTimestamp) {
      if (
        cachedValue.textTvResponse.page.number === page &&
        cachedValue.imgSrc.includes(page)
      ) {
        return cachedValue;
      }
    }

    return undefined;
  };

  const fetchPage = async (
    page: string,
    subPage: string,
    bypassCache?: boolean,
    setNewPage?: boolean,
  ): Promise<PageDetails> => {
    setErrorCode(undefined);

    const cachedValue = getCachedValue(page, subPage);

    if (cachedValue && !bypassCache) {
      setImgSrc(cachedValue.imgSrc);
      setTextTvResponse(cachedValue.textTvResponse);

      if (setNewPage) {
        setPage(page);
        setSubPage("1");
        addPageLoad();
      }

      return {
        imgSrc: cachedValue.imgSrc,
        textTvResponse: cachedValue.textTvResponse,
      };
    }

    setPageDataLoadingStatus(true);
    setImgLoadingStatus(true);

    const uri = getPageJsonPath(page);

    try {
      const response = await fetch(uri);

      if (response.status >= 400) {
        setErrorCode({ page, code: response.status });
        setPageDataLoadingStatus(false);
        setImgLoadingStatus(false);

        return {
          error: {
            page,
            code: response.status,
          },
        };
      }

      if (setNewPage) {
        setPage(page);
        setSubPage("1");
      }

      const mappedPage = mapTextTvResponse(await response.json());

      const src = getPageImgSrc(mappedPage.page.number, subPage);

      const srcWithCache = `${src}&cacheValid=${+new Date()}`;


      setTextTvResponse(mappedPage);
      setImgSrc(srcWithCache);

      const cacheKey = `${page}-${subPage}`;

      setCache({
        ...cache,
        [cacheKey]: {
          timestamp: +new Date(),
          textTvResponse: mappedPage,
          imgSrc: srcWithCache,
        },
      });

      setPageDataLoadingStatus(false);

      addPageLoad();

      return {
        imgSrc: srcWithCache,
        textTvResponse: mappedPage,
      };
    } catch (e) {
      // console.log("error in fetch", e);
      setErrorCode({ page, code: 418 });

      return {
        error: {
          page,
          code: 418,
        },
      };
    }
  };

  const invalidateCache = () => {
    setCache({});
  };

  return (
    <PageContext.Provider
      value={{
        fetchPage,
        invalidateCache,
        error,
        imgSrc,
        textTvResponse,
      }}>
      {props.children}
    </PageContext.Provider>
  );
};
