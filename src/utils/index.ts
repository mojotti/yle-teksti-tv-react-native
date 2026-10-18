import { TextTvResponse } from "../types/response";
import { ScreenRatio } from "../providers/settings";
import { APP_ID, APP_KEY } from "@env";

export const isValidPage = (input: string) => {
  if (input.length !== 3) {
    return false;
  }

  const inputAsNumber = Number(input);

  return (
    !Number.isNaN(inputAsNumber) && inputAsNumber >= 100 && inputAsNumber < 900
  );
};

export const hasValidEnvVariables = (): boolean => {
  return !!(APP_ID && APP_KEY && APP_ID.trim() !== "" && APP_KEY.trim() !== "");
};

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

/** Page height as a share of its width, per portrait size preset. */
export const ratioHeights: Record<Exclude<ScreenRatio, "full">, number> = {
  tv: 3 / 4,
  square: 1,
  tall: 4 / 3,
};

/**
 * Size of the teletext page inside the space available for it. Portrait
 * uses the full width and the chosen preset's height; landscape keeps the
 * TV 4:3 shape so letters are never stretched.
 */
export const getPageSize = (
  ratio: ScreenRatio,
  availableWidth: number,
  availableHeight: number,
  isLandscape: boolean,
): { width: number; height: number } => {
  if (availableWidth <= 0 || availableHeight <= 0) {
    return { width: 0, height: 0 };
  }

  if (isLandscape) {
    const width = Math.min(availableWidth, (availableHeight * 4) / 3);
    return { width, height: Math.min(availableHeight, (width * 3) / 4) };
  }

  if (ratio === "full") {
    return { width: availableWidth, height: availableHeight };
  }

  return {
    width: availableWidth,
    height: Math.min(availableHeight, availableWidth * ratioHeights[ratio]),
  };
};

/**
 * A short title for a page: the API's name when it has one, otherwise the
 * section heading from the page's first lines ("ULKOMAAT", "NBA-KORIPALLO").
 */
export const getPageTitle = (response: TextTvResponse): string => {
  const name = response.page.name?.trim();
  if (name) {
    return name;
  }
  const lines =
    response.page.subPages[0]?.content
      .find((c) => c.type === "text")
      ?.line.slice(0, 3) ?? [];
  for (const line of lines) {
    const part = (line.text ?? "")
      .split(/\s{2,}/)
      .map((x) => x.trim())
      .find((x) => x && !/^\d+\/\d+$/.test(x));
    if (part) {
      return part;
    }
  }
  return "";
};
