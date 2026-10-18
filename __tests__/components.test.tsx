import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SettingsContext,
  defaultSettings,
  Settings,
} from "../src/providers/settings";
import { Header, Rail } from "../src/components/home/header";
import { FastextRow, SubpageRow } from "../src/components/home/fastext";
import { Keypad } from "../src/components/home/keypad";
import { CoachProvider, STEPS } from "../src/components/home/onboarding";
import { HomeControls } from "../src/components/home/controls";

const controls = (o: Partial<HomeControls> = {}): HomeControls => ({
  pillText: "235",
  pillActive: false,
  page: "235",
  title: "NHL-jääkiekko",
  subPage: 1,
  subPageCount: 5,
  prevPage: "234",
  nextPage: "236",
  prevSub: 5,
  nextSub: 2,
  isLoading: false,
  canGoBack: true,
  isFavorite: false,
  favoriteIcon: "heart",
  goBack: jest.fn(),
  goHome: jest.fn(),
  goTo: jest.fn(),
  goPrevPage: jest.fn(),
  goNextPage: jest.fn(),
  goPrevSub: jest.fn(),
  goNextSub: jest.fn(),
  openKeypad: jest.fn(),
  toggleFavorite: jest.fn(),
  openMenu: jest.fn(),
  refresh: jest.fn(),
  share: jest.fn(),
  ...o,
});

const withSettings = async (
  ui: React.ReactElement,
  patch: Partial<Settings> = {},
) =>
  render(
    <SettingsContext.Provider
      value={{
        settings: { ...defaultSettings, ...patch },
        loaded: true,
        update: jest.fn(),
      }}
    >
      <CoachProvider>{ui}</CoachProvider>
    </SettingsContext.Provider>,
  );

beforeEach(() => AsyncStorage.clear());

describe("Header", () => {
  it("shows the page number and its title", async () => {
    await withSettings(<Header c={controls()} />);
    expect(screen.getByText("235")).toBeTruthy();
    expect(screen.getByText("NHL-jääkiekko · 1/5")).toBeTruthy();
  });

  it("has home, back, favourite, refresh and menu buttons that work", async () => {
    const c = controls();
    await withSettings(<Header c={c} />);
    for (const [label, fn] of [
      ["Etusivu", c.goHome],
      ["Takaisin", c.goBack],
      ["Lisää suosikkeihin", c.toggleFavorite],
      ["Päivitä", c.refresh],
      ["Lisää", c.openMenu],
    ] as const) {
      await fireEvent.press(screen.getByLabelText(label));
      expect(fn).toHaveBeenCalled();
    }
  });

  it("opens the keypad from the page number", async () => {
    const c = controls();
    await withSettings(<Header c={c} />);
    await fireEvent.press(
      screen.getByLabelText(/Sivu 235\. Avaa numeronäppäimistö/),
    );
    expect(c.openKeypad).toHaveBeenCalled();
  });

  it("disables home on the front page and hides back without history", async () => {
    await withSettings(
      <Header
        c={controls({ page: "100", pillText: "100", canGoBack: false })}
      />,
    );
    expect(screen.queryByLabelText("Takaisin")).toBeNull();
    expect(screen.getByLabelText("Etusivu")).toBeDisabled();
  });

  it("keeps share in the menu, not the header", async () => {
    await withSettings(<Header c={controls()} />);
    expect(screen.queryByLabelText("Jaa sivu")).toBeNull();
  });

  it("shows the subpage after the title", async () => {
    await withSettings(<Header c={controls({ subPage: 2 })} />);
    expect(screen.getByText("NHL-jääkiekko · 2/5")).toBeTruthy();
  });

  it("keeps the favourite button even when chips show no icon", async () => {
    await withSettings(<Header c={controls({ favoriteIcon: "none" })} />);
    expect(screen.getByLabelText("Lisää suosikkeihin")).toBeTruthy();
  });

  it("shows the typed digits while the keypad is open", async () => {
    await withSettings(
      <Header c={controls({ pillText: "2__", pillActive: true })} />,
    );
    expect(screen.getByText("2__")).toBeTruthy();
  });
});

describe("Rail (landscape)", () => {
  it("shows the page number and subpage count", async () => {
    await withSettings(<Rail c={controls()} />);
    expect(screen.getByText("235")).toBeTruthy();
    expect(screen.getByText("1/5")).toBeTruthy();
  });

  it("shows the subpage count even when the portrait row is hidden", async () => {
    await withSettings(<Rail c={controls()} />, { showSubpageRow: false });
    expect(screen.getByText("1/5")).toBeTruthy();
  });
});

describe("SubpageRow", () => {
  it("is hidden by default", async () => {
    await withSettings(<SubpageRow c={controls()} />);
    expect(screen.queryByText("1/5")).toBeNull();
  });

  it("can be shown, also for single pages", async () => {
    await withSettings(
      <SubpageRow c={controls({ subPageCount: 1, nextSub: 1, prevSub: 1 })} />,
      { showSubpageRow: true },
    );
    expect(screen.getByText("1/1")).toBeTruthy();
    expect(screen.getByLabelText("Seuraava alasivu")).toBeDisabled();
  });

  it("changes subpage with its arrows", async () => {
    const c = controls();
    await withSettings(<SubpageRow c={c} />, { showSubpageRow: true });
    await fireEvent.press(screen.getByLabelText("Seuraava alasivu"));
    await fireEvent.press(screen.getByLabelText("Edellinen alasivu"));
    expect(c.goNextSub).toHaveBeenCalled();
    expect(c.goPrevSub).toHaveBeenCalled();
  });
});

describe("FastextRow", () => {
  it("shows the four colour keys with their targets", async () => {
    const c = controls();
    await withSettings(<FastextRow c={c} />);
    expect(screen.getByText("234")).toBeTruthy();
    expect(screen.getByText("236")).toBeTruthy();
    expect(screen.getByText("5/5")).toBeTruthy();
    expect(screen.getByText("2/5")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Seuraava sivu 236"));
    expect(c.goNextPage).toHaveBeenCalled();
  });
});

describe("Keypad", () => {
  it("submits the page on the third digit", async () => {
    const onSubmit = jest.fn();
    await withSettings(
      <Keypad visible onSubmit={onSubmit} onClose={jest.fn()} />,
    );
    for (const d of ["2", "0", "1"]) {
      await fireEvent.press(screen.getByLabelText(d));
    }
    expect(onSubmit).toHaveBeenCalledWith("201");
  });

  it("explains the valid range after an invalid number", async () => {
    const onSubmit = jest.fn();
    await withSettings(
      <Keypad visible onSubmit={onSubmit} onClose={jest.fn()} />,
    );
    for (const d of ["9", "9", "9"]) {
      await fireEvent.press(screen.getByLabelText(d));
    }
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Sivunumeron pitää olla väliltä 100–899"),
    ).toBeTruthy();
  });

  it("offers recent pages and favourites as shortcuts", async () => {
    const onSubmit = jest.fn();
    await withSettings(
      <Keypad
        visible
        recent={["201"]}
        favorites={["235"]}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />,
    );
    await fireEvent.press(screen.getByLabelText("Sivu 235"));
    expect(onSubmit).toHaveBeenCalledWith("235");
  });

  it("renders nothing when hidden", async () => {
    await withSettings(
      <Keypad visible={false} onSubmit={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.queryByLabelText("1")).toBeNull();
  });
});

describe("first-run guide", () => {
  it("covers the page number, colour keys, home, refresh, favourites and menu", () => {
    expect(STEPS.map((s) => s.target)).toEqual([
      "pill",
      "fastext",
      "home",
      "refresh",
      "favorite",
      "menu",
    ]);
    for (const step of STEPS) {
      expect(step.text.length).toBeGreaterThan(10);
    }
  });
});

describe("FavoritesFeed", () => {
  const { FavoritesFeed } = require("../src/components/home/favorites-feed");
  const { PageContext } = require("../src/providers/page");
  const { response } = require("../test/fixtures");

  const renderFeed = async (favorites: string[], onOpen = jest.fn()) => {
    const loadResponse = jest.fn(async (p: string) => response({ number: p }));
    const utils = await withSettings(
      <PageContext.Provider value={{ loadResponse }}>
        <FavoritesFeed onOpen={onOpen} />
      </PageContext.Provider>,
      { favorites },
    );
    const list = screen.getByTestId("favorites-feed");
    await fireEvent(list, "layout", {
      nativeEvent: { layout: { width: 360, height: 700 } },
    });
    return { ...utils, loadResponse, onOpen };
  };

  it("works with a single favourite and explains how to add more", async () => {
    const { loadResponse, onOpen } = await renderFeed(["134"]);
    expect(loadResponse).toHaveBeenCalledWith("134", true);
    expect(screen.getByText("134")).toBeTruthy();
    expect(screen.getByText(/Asetukset → Suosikit/)).toBeTruthy();
    await fireEvent.press(screen.getByText("134"));
    expect(onOpen).toHaveBeenCalledWith("134", "1");
  });

  it("drops the hint once there are several favourites", async () => {
    await renderFeed(["100", "134", "235"]);
    expect(screen.queryByText(/Asetukset → Suosikit/)).toBeNull();
  });

  it("explains how to add favourites when there are none", async () => {
    await withSettings(<FavoritesFeed onOpen={jest.fn()} />, { favorites: [] });
    expect(screen.getByText(/Suosikkeja ei vielä ole/)).toBeTruthy();
  });
});
