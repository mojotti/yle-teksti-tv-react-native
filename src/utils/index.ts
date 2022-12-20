import { TextTvResponse } from "../types/response";
import { ScreenRatio } from "../providers/settings";

export const isValidPage = (input: string) => {
  if (input.length !== 3) {
    return false;
  }

  const inputAsNumber = Number(input);

  return inputAsNumber !== NaN && inputAsNumber >= 100 && inputAsNumber < 900;
};

const { APP_ID, APP_KEY } = process.env;

export const getPageImgSrc = (page: string, subPage = "1") => {
  return `https://external.api.yle.fi/v1/teletext/images/${page}/${subPage}.png?app_id=${APP_ID}&app_key=${APP_KEY}`;
};

export const getPageJsonPath = (page: string) => {
  return `https://external.api.yle.fi/v1/teletext/pages/${page}.json?app_id=${APP_ID}&app_key=${APP_KEY}`;
};

export const getNewSubPage = (
  current: number,
  max: number,
  direction: "next" | "back",
) => {
  switch (direction) {
    case "back": {
      if (current > 1) {
        return current - 1;
      }
      if (current === 1) {
        return max;
      }
      return undefined;
    }
    case "next": {
      if (current < max) {
        return current + 1;
      }
      return 1;
    }
    default:
      return undefined;
  }
};

export const isDefined = <T>(value: T | undefined): value is T => {
  return value !== undefined;
};

const defaultLinks = ["100", "200", "300", "400", "800"];

const getRangeOfNumbers = (start: number, end: number): number[] => {
  let mutableNumber = start;
  let mutableBlackList: number[] = [];

  while (mutableNumber < end) {
    mutableBlackList.push(mutableNumber);

    mutableNumber++;
  }

  return mutableBlackList;
};

const numArrayToStringArray = (arr: number[]) => {
  return arr.map((item) => String(item));
};

const getBlackListOfRange = (start: number, end: number) => {
  return numArrayToStringArray(getRangeOfNumbers(start, end));
};

const blackListedPages = [
  "237",
  "173",
  "174",
  ...getBlackListOfRange(176, 190),
];

export const isBlackListedPage = (page: string) =>
  blackListedPages.includes(page);

export const getLinkPages = (
  page: string,
  subPageNumber: string,
  mappedPage?: TextTvResponse,
) => {
  if (isBlackListedPage(page)) {
    return defaultLinks;
  }

  const subPage = mappedPage?.page.subPages[Number(subPageNumber) - 1];

  if (!subPage) {
    return defaultLinks;
  }

  const structured = subPage.content.find((t) => t.type === "structured");

  if (!structured) {
    return defaultLinks;
  }

  const lines = structured.line.flatMap((subLine) => subLine).filter(isDefined);

  const links = lines
    .flatMap((line) => line.run?.map((r) => r.link))
    .filter(isDefined);

  const linksWithHomePage = [...links, "100"];

  const filteredLinks = [
    ...new Set(linksWithHomePage.filter((link) => !isNaN(Number(link))).sort()),
  ];

  const linksToShow = filteredLinks.filter((link) => link !== page);

  return linksToShow.length === 1 ? defaultLinks : linksToShow;
};

export const getScreenHeight = (
  ratio: ScreenRatio,
  viewHeight: number,
  width: number,
  isLandscape: boolean,
): number => {
  if (isLandscape) {
    return viewHeight;
  }

  if (ratio === "full") {
    return viewHeight;
  }

  if (ratio === "goldenRatio") {
    const newHeight = width * 1.618033;

    if (newHeight < viewHeight) {
      return newHeight;
    }

    return viewHeight;
  }

  if (ratio === "16:9") {
    const newHeight = width * (16 / 9);

    if (newHeight < viewHeight) {
      return newHeight;
    }

    return viewHeight;
  }

  if (ratio === "4:3") {
    const newHeight = width * (4 / 3);

    if (newHeight < viewHeight) {
      return newHeight;
    }

    return viewHeight;
  }

  if (ratio === "3:2") {
    const newHeight = width * (3 / 2);

    if (newHeight < viewHeight) {
      return newHeight;
    }

    return viewHeight;
  }

  if (ratio === "1:1") {
    const newHeight = width;

    if (newHeight < viewHeight) {
      return newHeight;
    }

    return viewHeight;
  }

  return viewHeight;
};
