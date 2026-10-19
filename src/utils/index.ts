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

/** Whether getLinkPages fell back to the main sections (page has no links). */
export const isDefaultLinks = (links: string[]) => links === defaultLinks;

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

/** Tablets are screens at least 600 dp on their short side (Android's sw600dp). */
export const isTabletScreen = (screen?: { width: number; height: number }) =>
  !!screen && Math.min(screen.width, screen.height) >= 600;

/**
 * Size of the teletext page inside the space available for it. Portrait
 * uses the full width and the chosen preset's height; landscape keeps the
 * TV 4:3 shape so letters are never stretched. `scale` (0–1) shrinks the
 * space first, for the smaller page option on tablets.
 */
export const getPageSize = (
  ratio: ScreenRatio,
  fullWidth: number,
  fullHeight: number,
  isLandscape: boolean,
  scale = 1,
): { width: number; height: number } => {
  if (fullWidth <= 0 || fullHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const availableWidth = fullWidth * scale;
  const availableHeight = fullHeight * scale;

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

// Abbreviations that stay in capitals when an all-caps title is recased.
const ABBREVIATIONS = new Set([
  "TV",
  "NBA",
  "NHL",
  "NFL",
  "MLB",
  "KHL",
  "AHL",
  "MLS",
  "UFC",
  "ATP",
  "WTA",
  "F1",
  "MM",
  "EM",
  "SM",
  "EU",
  "USA",
  "UK",
  "UEFA",
  "FIFA",
  "IT",
  "HS",
  "PM",
]);

const recaseSegment = (segment: string, first: boolean) => {
  // Known abbreviations and codes with digits (TV1, MTV3) stay as they are.
  if (ABBREVIATIONS.has(segment) || /\d/.test(segment)) {
    return segment;
  }
  const lower = segment.toLocaleLowerCase("fi");
  return first
    ? lower.charAt(0).toLocaleUpperCase("fi") + lower.slice(1)
    : lower;
};

/**
 * Teletext headings are often all caps ("NBA-KORIPALLO"). Those are turned
 * into sentence case, keeping known abbreviations ("NBA-koripallo").
 * Titles with any lower-case letters keep their casing, apart from a
 * capital first letter ("på svenska" → "På svenska").
 */
export const prettyTitle = (title: string): string => {
  if (!/\p{L}/u.test(title)) {
    return title;
  }
  if (title !== title.toLocaleUpperCase("fi")) {
    return title.charAt(0).toLocaleUpperCase("fi") + title.slice(1);
  }
  let first = true;
  // Split on spaces, hyphens and slashes, keeping the separators.
  return title
    .split(/([\s\-/]+)/)
    .map((part) => {
      if (!part || /^[\s\-/]+$/.test(part)) {
        return part;
      }
      const out = recaseSegment(part, first);
      first = false;
      return out;
    })
    .join("");
};

/** The section heading in a subpage's first lines ("ULKOMAAT", "NHL/ITÄ"). */
const WEEKDAYS =
  /^(maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai|måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag)$/i;

/**
 * Cleans one heading candidate from a page's top lines, or returns "" when
 * it is not a heading: weekday names, "Yle", web addresses, subpage
 * counters, dates and times. Letter-spaced words ("V E I K K A U S") are
 * joined back together.
 */
export const cleanHeading = (part: string): string => {
  let text = part.trim();
  if (/^(\S )+\S$/.test(text)) {
    text = text.replace(/ /g, "");
  }
  text = text
    // Trailing dates, times and weekdays: "Pörssi 16.10. 18:34".
    .replace(/(\s+(\d{1,2}\.\d{1,2}\.(\d{2,4})?|\d{1,2}[:.]\d{2}|klo))+$/i, "")
    .trim();
  const words = text.split(/\s+/);
  while (words.length > 1 && WEEKDAYS.test(words[words.length - 1])) {
    words.pop();
  }
  text = words.join(" ");
  if (
    !/\p{L}/u.test(text) ||
    WEEKDAYS.test(text) ||
    /^yle$/i.test(text) ||
    /(\.fi|\.com|www\.)/i.test(text) ||
    /^\d+\/\d+$/.test(text)
  ) {
    return "";
  }
  return text;
};

const subPageHeading = (response: TextTvResponse, subPage: number) => {
  const lines =
    response.page.subPages[subPage - 1]?.content
      .find((c) => c.type === "text")
      ?.line.slice(0, 3) ?? [];
  for (const line of lines) {
    const part = (line.text ?? "")
      .split(/\s{2,}/)
      .map(cleanHeading)
      .find(Boolean);
    if (part) {
      return part;
    }
  }
  return "";
};

/**
 * A short title for a page or subpage: the subpage's own section heading
 * when it has one (they differ between subpages, e.g. "NHL/ITÄ" and
 * "NHL/LÄNSI"), otherwise the API's page name. All caps are recased.
 */
export const getPageTitle = (response: TextTvResponse, subPage = 1): string =>
  prettyTitle(
    subPageHeading(response, subPage) || response.page.name?.trim() || "",
  );

/** The page on Yle's own Teksti-TV website. */
export const getPageWebUrl = (page: string) =>
  `https://yle.fi/aihe/tekstitv?P=${page}`;
