import React, { useContext } from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PageContext } from "../src/providers/page";
import {
  NavigationStatusContext,
  NavigationStatusProvider,
} from "../src/providers/navigation-status";
import { SettingsProvider } from "../src/providers/settings";
import { AppStateProvider } from "../src/providers/app-state";
import { PageProvider } from "../src/providers/page";
import { apiJson } from "../test/fixtures";

type Ctx = {
  page: React.ContextType<typeof PageContext>;
  nav: React.ContextType<typeof NavigationStatusContext>;
};

const harness = async () => {
  const ref: { current?: Ctx } = {};
  const Probe = () => {
    ref.current = {
      page: useContext(PageContext),
      nav: useContext(NavigationStatusContext),
    };
    return null;
  };
  await render(
    <AppStateProvider>
      <SettingsProvider>
        <NavigationStatusProvider>
          <PageProvider>
            <Probe />
          </PageProvider>
        </NavigationStatusProvider>
      </SettingsProvider>
    </AppStateProvider>,
  );
  return ref as { current: Ctx };
};

/** fetch that serves pages from a table; `offline` makes every call fail. */
const network = () => {
  const state = {
    offline: false,
    delay: {} as Record<string, number>,
    missing: [] as string[],
  };
  (globalThis as any).fetch = jest.fn(async (url: string) => {
    const page = url.match(/pages\/(\d{3})\.json/)?.[1];
    if (state.offline) {
      throw new Error("Network request failed");
    }
    if (page && state.delay[page]) {
      await new Promise<void>((r) => setTimeout(() => r(), state.delay[page]));
    }
    if (page && state.missing.includes(page)) {
      return { status: 404, ok: false, json: async () => ({}) };
    }
    return {
      status: 200,
      ok: true,
      json: async () =>
        apiJson(page ?? "100", {
          subPages: 2,
          name: page === "100" ? "Uutiset" : "",
        }),
    };
  });
  return state;
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("PageProvider", () => {
  it("loads a page and remembers its title", async () => {
    network();
    const ctx = await harness();
    await act(() => ctx.current.page.fetchPage("235", "1", false, true));
    await waitFor(() => expect(ctx.current.nav.page).toBe("235"));
    expect(ctx.current.page.textTvResponse?.page.number).toBe("235");
    expect(ctx.current.page.imgSrc).toContain("/images/235/1.png");
    expect(ctx.current.page.pageNames["235"]).toBe("Otsikko 235/1");
    expect(ctx.current.nav.isLoadingPageData).toBe(false);
  });

  // Bug: refreshing a page without a connection showed the same image
  // again, which never fires onLoadEnd, so the spinner never stopped.
  it("ends loading when an offline refresh falls back to the same image", async () => {
    const net = network();
    const ctx = await harness();
    await act(() => ctx.current.page.fetchPage("100", "1", false, true));
    await act(async () => ctx.current.nav.setImgLoadingStatus(false)); // image shown
    expect(ctx.current.nav.isLoadingImg).toBe(false);
    net.offline = true;
    await act(() => ctx.current.page.fetchPage("100", "1", true));
    expect(ctx.current.nav.isLoadingImg).toBe(false);
    expect(ctx.current.nav.isLoadingPageData).toBe(false);
    expect(ctx.current.page.error).toBeUndefined();
    expect(ctx.current.page.stale?.page).toBe("100");
  });

  it("shows a saved copy for a page that can't be fetched, then clears the notice once online", async () => {
    const net = network();
    const ctx = await harness();
    await act(() => ctx.current.page.fetchPage("235", "1", false, true));
    net.offline = true;
    await act(() => ctx.current.page.fetchPage("235", "1", true));
    expect(ctx.current.page.stale).toBeDefined();
    net.offline = false;
    await act(() => ctx.current.page.fetchPage("235", "1", true));
    expect(ctx.current.page.stale).toBeUndefined();
  });

  it("reports an error, and drops any saved-copy notice, for a page never loaded", async () => {
    const net = network();
    const ctx = await harness();
    await act(() => ctx.current.page.fetchPage("100", "1", false, true));
    net.offline = true;
    await act(() => ctx.current.page.fetchPage("100", "1", true));
    expect(ctx.current.page.stale).toBeDefined();
    await act(() => ctx.current.page.fetchPage("108", "1", false, true));
    expect(ctx.current.page.error).toEqual({ page: "108", code: 503 });
    expect(ctx.current.page.stale).toBeUndefined();
    expect(ctx.current.nav.isLoadingImg).toBe(false);
  });

  it("reports a missing page as 404 without changing the current page", async () => {
    const net = network();
    const ctx = await harness();
    await act(() => ctx.current.page.fetchPage("100", "1", false, true));
    net.missing = ["999"];
    await act(() => ctx.current.page.fetchPage("999", "1", false, true));
    expect(ctx.current.page.error).toEqual({ page: "999", code: 404 });
    expect(ctx.current.nav.page).toBe("100");
  });

  it("ignores a slow response that a newer request has overtaken", async () => {
    const net = network();
    const ctx = await harness();
    net.delay = { "201": 50 };
    let slow: Promise<unknown>;
    await act(async () => {
      slow = ctx.current.page.fetchPage("201", "1", false, true);
      await ctx.current.page.fetchPage("300", "1", false, true);
      await slow;
    });
    expect(ctx.current.nav.page).toBe("300");
    expect(ctx.current.page.textTvResponse?.page.number).toBe("300");
  });

  it("serves a fresh cached page without fetching again", async () => {
    network();
    const ctx = await harness();
    await act(() => ctx.current.page.fetchPage("235", "1", false, true));
    const calls = (globalThis.fetch as jest.Mock).mock.calls.length;
    await act(() => ctx.current.page.fetchPage("235", "1", false, true));
    expect((globalThis.fetch as jest.Mock).mock.calls.length).toBe(calls);
  });

  it("tells whether a page exists when adding favourites", async () => {
    const net = network();
    const ctx = await harness();
    net.missing = ["999"];
    expect(await ctx.current.page.lookupPage("999")).toBe("missing");
    expect(await ctx.current.page.lookupPage("235")).toBe("ok");
    net.offline = true;
    expect(await ctx.current.page.lookupPage("400")).toBe("error");
  });
});
