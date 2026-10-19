import {
  getLinkPages,
  getNewSubPage,
  getPageSize,
  getPageTitle,
  getPageWebUrl,
  cleanHeading,
  isTabletScreen,
  isValidPage,
  prettyTitle,
} from "../src/utils";
import { response } from "../test/fixtures";

describe("isValidPage", () => {
  it.each([
    ["100", true],
    ["899", true],
    ["450", true],
    ["900", false],
    ["099", false],
    ["12", false],
    ["1000", false],
    ["abc", false],
    ["", false],
  ])("%s → %s", (input, valid) => {
    expect(isValidPage(input)).toBe(valid);
  });
});

describe("getNewSubPage", () => {
  it("steps and wraps in both directions", () => {
    expect(getNewSubPage(1, 4, "next")).toBe(2);
    expect(getNewSubPage(4, 4, "next")).toBe(1);
    expect(getNewSubPage(1, 4, "back")).toBe(4);
    expect(getNewSubPage(3, 4, "back")).toBe(2);
  });

  it("stays on a single subpage", () => {
    expect(getNewSubPage(1, 1, "next")).toBe(1);
    expect(getNewSubPage(1, 1, "back")).toBe(1);
  });
});

describe("getPageSize", () => {
  it("uses the full width and the preset height in portrait", () => {
    expect(getPageSize("tv", 400, 800, false)).toEqual({
      width: 400,
      height: 300,
    });
    expect(getPageSize("square", 400, 800, false)).toEqual({
      width: 400,
      height: 400,
    });
    expect(getPageSize("tall", 300, 800, false)).toEqual({
      width: 300,
      height: 400,
    });
    expect(getPageSize("full", 400, 800, false)).toEqual({
      width: 400,
      height: 800,
    });
  });

  it("never exceeds the available height", () => {
    expect(getPageSize("tall", 400, 500, false)).toEqual({
      width: 400,
      height: 500,
    });
  });

  it("keeps the TV 4:3 shape in landscape, whatever the preset", () => {
    for (const ratio of ["tv", "square", "tall", "full"] as const) {
      const size = getPageSize(ratio, 900, 300, true);
      expect(size).toEqual({ width: 400, height: 300 });
    }
    expect(getPageSize("tall", 300, 300, true)).toEqual({
      width: 300,
      height: 225,
    });
  });

  it("shrinks the page for the smaller tablet sizes", () => {
    expect(getPageSize("square", 1000, 1600, false, 0.7)).toEqual({
      width: 700,
      height: 700,
    });
    expect(getPageSize("full", 1000, 1600, false, 0.5)).toEqual({
      width: 500,
      height: 800,
    });
    expect(getPageSize("tv", 1600, 900, true, 0.5)).toEqual({
      width: 600,
      height: 450,
    });
  });

  it("returns zero before layout", () => {
    expect(getPageSize("tall", 0, 0, false)).toEqual({ width: 0, height: 0 });
    expect(getPageSize("tall", 400, 0, false)).toEqual({ width: 0, height: 0 });
  });
});

describe("prettyTitle", () => {
  it.each([
    ["NHL-JÄÄKIEKKO", "NHL-jääkiekko"],
    ["NBA-KORIPALLO", "NBA-koripallo"],
    ["SM-LIIGA", "SM-liiga"],
    ["TALOUS", "Talous"],
    ["YLE", "Yle"],
    ["DIGI-TV- JA TEKSTI-TV-TIETOA", "Digi-TV- ja teksti-TV-tietoa"],
    ["ULKOMAAT", "Ulkomaat"],
  ])("%s → %s", (input, out) => {
    expect(prettyTitle(input)).toBe(out);
  });

  it("leaves mixed-case and empty titles alone", () => {
    expect(prettyTitle("Sää liikenne")).toBe("Sää liikenne");
    expect(prettyTitle("Uutiset")).toBe("Uutiset");
    expect(prettyTitle("")).toBe("");
    expect(prettyTitle("123")).toBe("123");
  });
});

describe("getPageTitle with real page headers", () => {
  // Top lines as Yle's API returned them (2026-10-18), with the page name.
  it.each<[string, (string | undefined)[], string, string]>([
    [
      "102: heading is graphics, only the weekday is text",
      [undefined, "                           SUNNUNTAI    ", undefined],
      "Kotimaa",
      "Kotimaa",
    ],
    [
      "130",
      [undefined, "                            SUNNUNTAI   ", undefined],
      "Ulkomaat",
      "Ulkomaat",
    ],
    [
      "101: only the Yle logo text",
      [undefined, "   Yle                                  ", undefined],
      "",
      "",
    ],
    ["103", ["   KOTIMAA         YLE  SUNNUNTAI       "], "", "Kotimaa"],
    [
      "175: date and time after the heading",
      [
        "   Helsingin Pörssi 16.10. 18:34        ",
        undefined,
        "         P Ö R S S I S I V U T          ",
      ],
      "Pörssisivut",
      "Helsingin Pörssi",
    ],
    [
      "201: web address next to the heading",
      ["     URHEILU          yle.fi/urheilu    "],
      "Uutiset",
      "Urheilu",
    ],
    [
      "301: weekday and date after the channel",
      [
        "                                    1/2 ",
        "   TV1            Sunnuntai 18.10.      ",
      ],
      "YLE TV1",
      "TV1",
    ],
    [
      "401",
      [
        "                                    1/3 ",
        "            Ilmatieteen laitos 18.10.   ",
      ],
      "",
      "Ilmatieteen laitos",
    ],
    [
      "470: letter-spaced heading",
      ["       V E I K K A U S S I V U T        "],
      "Veikkaus",
      "Veikkaussivut",
    ],
    ["501", ["   Etelä-Karjala       SUNNUNTAI    1/5 "], "", "Etelä-Karjala"],
    [
      "700: only a web address",
      [undefined, "                         svenska.yle.fi ", undefined],
      "på svenska",
      "På svenska",
    ],
    [
      "701: Swedish weekday",
      ["   HUVUDNYHETER  INDEX 700 SÖNDAG   1/4 "],
      "",
      "Huvudnyheter",
    ],
    [
      "890: a lone dot",
      [undefined, "                                      . ", undefined],
      "",
      "",
    ],
  ])("%s", (_, text, name, title) => {
    expect(getPageTitle(response({ name, subPages: [{ text }] }))).toBe(title);
  });

  it("ignores non-headings", () => {
    expect(cleanHeading("SUNNUNTAI")).toBe("");
    expect(cleanHeading("Yle")).toBe("");
    expect(cleanHeading("1/4")).toBe("");
    expect(cleanHeading("17.10.")).toBe("");
    expect(cleanHeading("yle.fi/urheilu")).toBe("");
  });
});

describe("getPageTitle", () => {
  it("uses the section heading, recased", () => {
    expect(
      getPageTitle(
        response({
          subPages: [{ text: ["   ULKOMAAT        YLE  SUNNUNTAI"] }],
        }),
      ),
    ).toBe("Ulkomaat");
    expect(
      getPageTitle(
        response({
          subPages: [{ text: ["   NBA-KORIPALLO            22.10.  1/1 "] }],
        }),
      ),
    ).toBe("NBA-koripallo");
  });

  it("follows the subpage, so the title updates when the subpage changes", () => {
    const r = response({
      name: "Jääkiekko",
      subPages: [
        { text: ["   NHL/ITÄ        17.10.  1/2"] },
        { text: ["   NHL/LÄNSI      17.10.  2/2"] },
      ],
    });
    expect(getPageTitle(r, 1)).toBe("NHL/itä");
    expect(getPageTitle(r, 2)).toBe("NHL/länsi");
  });

  it("falls back to the API name when the page has no text heading", () => {
    expect(
      getPageTitle(
        response({
          name: "Uutiset",
          subPages: [{ text: [undefined, undefined] }],
        }),
      ),
    ).toBe("Uutiset");
  });

  it("skips subpage counters and blank lines", () => {
    expect(
      getPageTitle(
        response({
          subPages: [
            {
              text: [
                "                                    1/1 ",
                "     DIGI-TV- JA TEKSTI-TV-TIETOA       ",
              ],
            },
          ],
        }),
      ),
    ).toBe("Digi-TV- ja teksti-TV-tietoa");
  });

  it("is empty when there is nothing to go on", () => {
    expect(getPageTitle(response({ subPages: [{ text: [] }] }))).toBe("");
  });

  it("handles a subpage index past the end", () => {
    expect(getPageTitle(response({ name: "Talous" }), 5)).toBe("Talous");
  });
});

describe("getPageWebUrl", () => {
  it("points at Yle's Teksti-TV page", () => {
    expect(getPageWebUrl("201")).toBe("https://yle.fi/aihe/tekstitv?P=201");
  });
});

describe("getLinkPages", () => {
  it("lists the page's links sorted, without the page itself, plus 100", () => {
    const r = response({
      number: "200",
      subPages: [
        {
          runs: [
            [[3, "201"], [10]],
            [
              [3, "235"],
              [3, "200"],
            ],
          ],
        },
      ],
    });
    expect(getLinkPages("200", "1", r)).toEqual(["100", "201", "235"]);
  });

  it("falls back to default links when the page has none", () => {
    expect(getLinkPages("135", "1", response())).toEqual([
      "100",
      "200",
      "300",
      "400",
      "800",
    ]);
  });
});

describe("isTabletScreen", () => {
  it("is true from 600 dp on the short side, in either orientation", () => {
    expect(isTabletScreen({ width: 430, height: 932 })).toBe(false);
    expect(isTabletScreen({ width: 600, height: 960 })).toBe(true);
    expect(isTabletScreen({ width: 1366, height: 1024 })).toBe(true);
    expect(isTabletScreen(undefined)).toBe(false);
  });
});
