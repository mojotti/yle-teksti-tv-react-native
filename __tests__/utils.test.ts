import {
  getLinkPages,
  getNewSubPage,
  getPageSize,
  getPageTitle,
  getPageWebUrl,
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
