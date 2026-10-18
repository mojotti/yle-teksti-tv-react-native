import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearOffline,
  downloadPages,
  formatClock,
  getOfflinePage,
  getOfflineSummary,
} from "../src/utils/offline";
import { apiJson } from "../test/fixtures";

class FakeReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL() {
    this.result = "data:image/png;base64,AAAA";
    this.onload?.();
  }
}

beforeEach(async () => {
  await AsyncStorage.clear();
  (globalThis as any).FileReader = FakeReader;
});

const mockFetch = (pages: Record<string, number>, fail: string[] = []) => {
  (globalThis as any).fetch = jest.fn(async (url: string) => {
    const page = url.match(/\/(\d{3})[./]/)?.[1] ?? "";
    if (fail.includes(page)) {
      return { ok: false, status: 503, json: async () => ({}) };
    }
    if (url.includes("/pages/")) {
      return {
        ok: true,
        status: 200,
        json: async () => apiJson(page, { subPages: pages[page] }),
      };
    }
    return { ok: true, status: 200, blob: async () => ({}) };
  });
};

describe("downloadPages", () => {
  it("saves every page with all its subpage images and reports progress", async () => {
    mockFetch({ "100": 4, "235": 2 });
    const progress: number[] = [];
    const summary = await downloadPages(["100", "235"], (done) =>
      progress.push(done),
    );
    expect(summary.pages).toBe(2);
    expect(summary.subPages).toBe(6);
    expect(progress).toEqual([0, 1, 2]);
    const saved = await getOfflinePage("100");
    expect(Object.keys(saved!.images)).toEqual(["1", "2", "3", "4"]);
    expect(saved!.response.page.number).toBe("100");
    expect(await getOfflineSummary()).toEqual(summary);
  });

  it("keeps an earlier copy when a page fails, and drops pages no longer listed", async () => {
    mockFetch({ "100": 1, "235": 1, "400": 1 });
    await downloadPages(["100", "235", "400"]);
    mockFetch({ "100": 1, "235": 1 }, ["235"]);
    const summary = await downloadPages(["100", "235"]);
    expect(summary.pages).toBe(1);
    expect(await getOfflinePage("235")).toBeDefined();
    expect(await getOfflinePage("400")).toBeUndefined();
  });

  it("clears everything", async () => {
    mockFetch({ "100": 1 });
    await downloadPages(["100"]);
    await clearOffline();
    expect(await getOfflinePage("100")).toBeUndefined();
    expect(await getOfflineSummary()).toBeUndefined();
  });
});

describe("formatClock", () => {
  it("shows only the time for today and the date otherwise", () => {
    const now = new Date();
    now.setHours(9, 5, 0, 0);
    expect(formatClock(now.getTime())).toBe("klo 9.05");
    const earlier = new Date(2026, 9, 1, 14, 30);
    expect(formatClock(earlier.getTime())).toBe("1.10. klo 14.30");
  });
});
