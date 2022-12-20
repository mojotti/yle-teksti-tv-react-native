import React, {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
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
      }}>
      {props.children}
    </NavigationStatusContext.Provider>
  );
};
