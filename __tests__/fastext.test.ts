import { buildKeys } from "../src/components/home/fastext";

const noop = () => {};
const controls = (o: Partial<Parameters<typeof buildKeys>[0]> = {}) => ({
  prevPage: "106",
  nextPage: "108",
  subPageCount: 4,
  prevSub: 4,
  nextSub: 2,
  goPrevPage: noop,
  goNextPage: noop,
  goPrevSub: noop,
  goNextSub: noop,
  ...o,
});

describe("buildKeys", () => {
  it("red/green go to the previous/next page, yellow/cyan change subpage", () => {
    const [red, green, yellow, cyan] = buildKeys(controls(), "pagesHorizontal");
    expect(red).toMatchObject({
      text: "106",
      lead: "chevron-back",
      enabled: true,
    });
    expect(green).toMatchObject({
      text: "108",
      trail: "chevron-forward",
      enabled: true,
    });
    expect(yellow).toMatchObject({
      text: "4/4",
      lead: "chevron-up",
      enabled: true,
    });
    expect(cyan).toMatchObject({
      text: "2/4",
      trail: "chevron-down",
      enabled: true,
    });
  });

  it("turns the arrows when pages are swiped vertically", () => {
    const [red, green, yellow, cyan] = buildKeys(controls(), "pagesVertical");
    expect(red.lead).toBe("chevron-up");
    expect(green.trail).toBe("chevron-down");
    expect(yellow.lead).toBe("chevron-back");
    expect(cyan.trail).toBe("chevron-forward");
  });

  it("disables what isn't there", () => {
    const keys = buildKeys(
      controls({
        prevPage: undefined,
        subPageCount: 1,
        prevSub: 1,
        nextSub: 1,
      }),
      "pagesHorizontal",
    );
    expect(keys.map((k) => k.enabled)).toEqual([false, true, false, false]);
    expect(keys[0].text).toBe("");
    expect(keys[2].text).toBe("");
  });

  it("gives every key a spoken label", () => {
    for (const k of buildKeys(controls(), "pagesHorizontal")) {
      expect(k.label.length).toBeGreaterThan(5);
    }
  });
});
