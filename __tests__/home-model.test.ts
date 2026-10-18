import {
  addFavorite,
  buildPageModel,
  neighbourPages,
  parsePageLink,
  wantsFeed,
} from "../src/screens/home-model";
import { response } from "../test/fixtures";

const base = {
  page: "107",
  subPage: "1",
  keypadOpen: false,
  digits: "",
};

describe("buildPageModel", () => {
  it("shows the current page with its keys and title", () => {
    const m = buildPageModel({
      ...base,
      response: response({
        number: "107",
        prev: "106",
        next: "108",
        subPages: [{ text: ["   KOTIMAA   YLE"] }],
      }),
    });
    expect(m).toMatchObject({
      page: "107",
      pillText: "107",
      title: "Kotimaa",
      prevPage: "106",
      nextPage: "108",
      subPage: 1,
      subPageCount: 1,
      failed: false,
    });
  });

  it("shows the pending page in the pill while it loads, without a stale title", () => {
    const m = buildPageModel({
      ...base,
      pending: "201",
      response: response({ number: "107" }),
    });
    expect(m.pillText).toBe("201");
    expect(m.title).toBeUndefined();
  });

  it("shows typed digits while the keypad is open", () => {
    expect(
      buildPageModel({ ...base, keypadOpen: true, digits: "" }).pillText,
    ).toBe("___");
    expect(
      buildPageModel({ ...base, keypadOpen: true, digits: "2" }).pillText,
    ).toBe("2__");
    expect(
      buildPageModel({ ...base, keypadOpen: true, digits: "20" }).pillText,
    ).toBe("20_");
  });

  // Airplane mode: 107 loaded, 108 failed. Header, keys and error page must
  // all talk about 108, not leave the header on 107 and the keys on 106/108.
  it("aligns everything on the failed page when a page can't be fetched", () => {
    const m = buildPageModel({
      ...base,
      response: response({ number: "107", prev: "106", next: "108" }),
      error: { page: "108", code: 503 },
    });
    expect(m).toMatchObject({
      page: "108",
      pillText: "108",
      prevPage: "107",
      nextPage: "109",
      subPageCount: 1,
      failed: true,
    });
    expect(m.title).toBeUndefined();
  });

  it("keeps the current page for a missing page (404 shows a band instead)", () => {
    const m = buildPageModel({
      ...base,
      response: response({ number: "107", prev: "106", next: "108" }),
      error: { page: "999", code: 404 },
    });
    expect(m.page).toBe("107");
    expect(m.failed).toBe(false);
    expect(m.prevPage).toBe("106");
  });

  it("follows the subpage for title and subpage keys", () => {
    const r = response({
      subPages: [
        { text: ["   NHL/ITÄ"] },
        { text: ["   NHL/LÄNSI"] },
        { text: ["   NHL/TULOKSET"] },
      ],
    });
    const second = buildPageModel({ ...base, subPage: "2", response: r });
    expect(second.title).toBe("NHL/länsi");
    expect(second).toMatchObject({
      subPage: 2,
      subPageCount: 3,
      prevSub: 1,
      nextSub: 3,
    });
    const first = buildPageModel({ ...base, subPage: "1", response: r });
    expect(first.title).toBe("NHL/itä");
    expect(first.prevSub).toBe(3);
  });

  it("clamps a subpage beyond the page's count", () => {
    const m = buildPageModel({ ...base, subPage: "4", response: response() });
    expect(m.subPage).toBe(1);
  });

  it("works before any page has loaded", () => {
    const m = buildPageModel({ ...base, page: "100" });
    expect(m).toMatchObject({
      page: "100",
      pillText: "100",
      subPageCount: 1,
      failed: false,
    });
    expect(m.prevPage).toBeUndefined();
  });
});

describe("neighbourPages", () => {
  it("stays within 100–899", () => {
    expect(neighbourPages("100")).toEqual({ prev: undefined, next: "101" });
    expect(neighbourPages("899")).toEqual({ prev: "898", next: undefined });
    expect(neighbourPages("450")).toEqual({ prev: "449", next: "451" });
  });
});

describe("addFavorite", () => {
  it("keeps a number-ordered list in number order", () => {
    expect(addFavorite(["100", "235"], "134", 20)).toEqual([
      "100",
      "134",
      "235",
    ]);
    expect(addFavorite([], "235", 20)).toEqual(["235"]);
    expect(addFavorite(["235"], "100", 20)).toEqual(["100", "235"]);
  });

  it("appends to a list the user has reordered", () => {
    expect(addFavorite(["235", "100"], "134", 20)).toEqual([
      "235",
      "100",
      "134",
    ]);
  });

  it("ignores duplicates and respects the maximum", () => {
    expect(addFavorite(["100"], "100", 20)).toEqual(["100"]);
    expect(addFavorite(["100", "101"], "102", 2)).toEqual(["100", "101"]);
  });
});

describe("wantsFeed", () => {
  it("shows the favourites feed only when chosen and there are favourites", () => {
    expect(wantsFeed("favorites", ["235"])).toBe(true);
    expect(wantsFeed("favorites", [])).toBe(false);
    expect(wantsFeed("front", ["235"])).toBe(false);
  });

  it("lets a widget link win over the favourites start view", () => {
    expect(wantsFeed("favorites", ["235"], true)).toBe(false);
  });
});

describe("parsePageLink", () => {
  it.each([
    ["tekstitv://page/236", { page: "236", subPage: "1" }],
    ["tekstitv://page/236/2", { page: "236", subPage: "2" }],
    ["tekstitv://page/236/", { page: "236", subPage: "1" }],
    ["tekstitv://page/100/0", { page: "100", subPage: "1" }],
  ])("%s", (url, out) => {
    expect(parsePageLink(url)).toEqual(out);
  });

  it.each([
    null,
    undefined,
    "",
    "tekstitv://page/999",
    "tekstitv://page/12",
    "https://yle.fi/aihe/tekstitv?P=201",
    "tekstitv://page/201/abc",
  ])("rejects %p", (url) => {
    expect(parsePageLink(url as string)).toBeUndefined();
  });
});
