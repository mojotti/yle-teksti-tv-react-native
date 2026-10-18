import { getNewSubPage, getPageTitle, isValidPage } from "../utils";
import { TextTvResponse } from "../types/response";
import type { PageFetchError } from "../providers/page";

/** What the home screen's chrome shows, derived from navigation state. */
export interface PageModel {
  /** The page the header, colour keys and favourite button refer to. */
  page: string;
  /** Text in the page-number pill. */
  pillText: string;
  title?: string;
  subPage: number;
  subPageCount: number;
  prevPage?: string;
  nextPage?: string;
  prevSub?: number;
  nextSub?: number;
  /** A page that failed to load (not 404) is being shown as an error page. */
  failed: boolean;
}

export interface PageModelInput {
  page: string;
  subPage: string;
  pending?: string;
  keypadOpen: boolean;
  digits: string;
  response?: TextTvResponse;
  error?: PageFetchError;
}

/** The page numbers on either side, within 100–899. */
export const neighbourPages = (page: string) => {
  const n = Number(page);
  const prev = String(n - 1);
  const next = String(n + 1);
  return {
    prev: isValidPage(prev) ? prev : undefined,
    next: isValidPage(next) ? next : undefined,
  };
};

export const buildPageModel = (input: PageModelInput): PageModel => {
  const { error, response, keypadOpen, digits, pending } = input;
  const failed = !!error && error.code !== 404;

  // A failed page takes over the header and keys, so everything on screen
  // agrees on one number (and the keys can step on to other saved pages).
  if (failed) {
    const { prev, next } = neighbourPages(error!.page);
    return {
      page: error!.page,
      pillText: keypadOpen ? (digits + "___").slice(0, 3) : error!.page,
      subPage: 1,
      subPageCount: 1,
      prevPage: prev,
      nextPage: next,
      failed,
    };
  }

  const subPageCount = Number(response?.page.subPageCount || 1);
  const subPage = Math.min(Number(input.subPage) || 1, subPageCount);
  return {
    page: input.page,
    pillText: keypadOpen
      ? (digits + "___").slice(0, 3)
      : (pending ?? input.page),
    title:
      response && !pending && !keypadOpen
        ? getPageTitle(response, subPage)
        : undefined,
    subPage,
    subPageCount,
    prevPage: response?.page.prevPage,
    nextPage: response?.page.nextPage,
    prevSub: getNewSubPage(subPage, subPageCount, "back"),
    nextSub: getNewSubPage(subPage, subPageCount, "next"),
    failed,
  };
};

/**
 * Adds a favourite. A list that is in number order stays in number order;
 * a list the user has reordered gets the new page at the end.
 */
export const addFavorite = (favorites: string[], page: string, max: number) => {
  if (favorites.includes(page) || favorites.length >= max) {
    return favorites;
  }
  const sorted = favorites.every((f, i) => i === 0 || favorites[i - 1] <= f);
  const next = [...favorites, page];
  return sorted ? next.sort() : next;
};

/**
 * Whether the favourites feed should be showing for the given settings. A
 * page opened from a link (widget tap) wins over the start view.
 */
export const wantsFeed = (
  startView: string,
  favorites: string[],
  openedFromLink = false,
) => !openedFromLink && startView === "favorites" && favorites.length > 0;

/** Reads a tekstitv://page/236 or tekstitv://page/236/2 link (widget taps). */
export const parsePageLink = (
  url: string | null | undefined,
): { page: string; subPage: string } | undefined => {
  const match = url?.match(/^tekstitv:\/\/page\/(\d{3})(?:\/(\d{1,2}))?\/?$/);
  if (!match || !isValidPage(match[1])) {
    return undefined;
  }
  return {
    page: match[1],
    subPage: match[2] && match[2] !== "0" ? match[2] : "1",
  };
};
