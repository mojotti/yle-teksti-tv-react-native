import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPageImgSrc, getPageJsonPath } from ".";
import { mapTextTvResponse } from "./mapper";
import { TextTvResponse } from "../types/response";

/** A page saved for reading without a connection. */
export interface OfflinePage {
  response: TextTvResponse;
  /** Subpage number → image as a data URI. */
  images: Record<string, string>;
  savedAt: number;
}

export interface OfflineSummary {
  pages: number;
  subPages: number;
  bytes: number;
  savedAt: number;
}

const PAGE_KEY = (page: string) => `@offline:page:${page}`;
const SUMMARY_KEY = "@offline:summary";

const blobToDataUri = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const downloadPage = async (page: string): Promise<OfflinePage> => {
  const res = await fetch(getPageJsonPath(page));
  if (res.status >= 400) {
    throw new Error(`HTTP ${res.status}`);
  }
  const response = mapTextTvResponse(await res.json());
  const count = Number(response.page.subPageCount || 1);
  const images: Record<string, string> = {};
  for (let n = 1; n <= count; n++) {
    const img = await fetch(
      `${getPageImgSrc(page, String(n))}&cacheValid=${Date.now()}`,
    );
    if (img.ok) {
      images[String(n)] = await blobToDataUri(await img.blob());
    }
  }
  return { response, images, savedAt: Date.now() };
};

/**
 * Saves the given pages and all their subpages. Pages that fail are skipped;
 * earlier copies of them are kept. Pages no longer in the list are removed.
 */
export const downloadPages = async (
  pages: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<OfflineSummary> => {
  let subPages = 0;
  let bytes = 0;
  let saved = 0;

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i, pages.length);
    try {
      const entry = await downloadPage(pages[i]);
      const json = JSON.stringify(entry);
      await AsyncStorage.setItem(PAGE_KEY(pages[i]), json);
      subPages += Object.keys(entry.images).length;
      bytes += json.length;
      saved++;
    } catch {
      // Keep whatever was saved before for this page.
    }
  }
  onProgress?.(pages.length, pages.length);

  const keys = await AsyncStorage.getAllKeys();
  const stale = keys.filter(
    (k) =>
      k.startsWith("@offline:page:") &&
      !pages.includes(k.replace("@offline:page:", "")),
  );
  if (stale.length) {
    await AsyncStorage.multiRemove(stale);
  }

  const summary = { pages: saved, subPages, bytes, savedAt: Date.now() };
  await AsyncStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
  return summary;
};

export const getOfflinePage = async (
  page: string,
): Promise<OfflinePage | undefined> => {
  const v = await AsyncStorage.getItem(PAGE_KEY(page));
  return v ? JSON.parse(v) : undefined;
};

export const getOfflineSummary = async (): Promise<
  OfflineSummary | undefined
> => {
  const v = await AsyncStorage.getItem(SUMMARY_KEY);
  return v ? JSON.parse(v) : undefined;
};

export const clearOffline = async () => {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith("@offline:")));
};

export const formatClock = (ms: number) => {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  const time = `${d.getHours()}.${String(d.getMinutes()).padStart(2, "0")}`;
  return today
    ? `klo ${time}`
    : `${d.getDate()}.${d.getMonth() + 1}. klo ${time}`;
};
