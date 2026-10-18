import {
  getNewSubPage,
  getPageSize,
  getPageTitle,
  isValidPage,
} from "../src/utils";
import { TextTvResponse } from "../src/types/response";

const response = (
  name: string,
  lines: (string | undefined)[],
): TextTvResponse => ({
  network: "",
  xml: "",
  page: {
    number: "135",
    name,
    time: "",
    subPageCount: "1",
    topType: "",
    animated: "",
    subPages: [
      {
        number: "1",
        time: "",
        content: [
          {
            type: "text",
            line: lines.map((text, i) => ({ number: String(i + 1), text })),
          },
        ],
      },
    ],
  },
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

  it("keeps the TV 4:3 shape in landscape", () => {
    expect(getPageSize("full", 900, 300, true)).toEqual({
      width: 400,
      height: 300,
    });
    expect(getPageSize("tall", 300, 300, true)).toEqual({
      width: 300,
      height: 225,
    });
  });

  it("returns zero before layout", () => {
    expect(getPageSize("tall", 0, 0, false)).toEqual({ width: 0, height: 0 });
  });
});

describe("getPageTitle", () => {
  it("prefers the API name", () => {
    expect(getPageTitle(response("Uutiset", ["   ULKOMAAT   YLE"]))).toBe(
      "Uutiset",
    );
  });

  it("falls back to the section heading", () => {
    expect(
      getPageTitle(response("", ["   ULKOMAAT        YLE  SUNNUNTAI       "])),
    ).toBe("ULKOMAAT");
    expect(
      getPageTitle(response("", ["   NBA-KORIPALLO            22.10.  1/1 "])),
    ).toBe("NBA-KORIPALLO");
  });

  it("skips subpage counters and empty lines", () => {
    expect(
      getPageTitle(
        response("", [
          "                                    1/1 ",
          "     DIGI-TV- JA TEKSTI-TV-TIETOA       ",
        ]),
      ),
    ).toBe("DIGI-TV- JA TEKSTI-TV-TIETOA");
    expect(getPageTitle(response("", [undefined, undefined]))).toBe("");
  });
});

describe("getNewSubPage", () => {
  it("wraps around in both directions", () => {
    expect(getNewSubPage(1, 4, "back")).toBe(4);
    expect(getNewSubPage(4, 4, "next")).toBe(1);
    expect(getNewSubPage(2, 4, "next")).toBe(3);
  });
});

describe("isValidPage", () => {
  it("accepts 100–899 only", () => {
    expect(isValidPage("100")).toBe(true);
    expect(isValidPage("899")).toBe(true);
    expect(isValidPage("900")).toBe(false);
    expect(isValidPage("099")).toBe(false);
    expect(isValidPage("12")).toBe(false);
  });
});
