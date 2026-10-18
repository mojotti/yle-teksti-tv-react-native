import {
  cropFrame,
  getLinkBoxes,
  IMAGE,
  pageInset,
} from "../src/utils/page-geometry";
import { response } from "../test/fixtures";

describe("cropFrame", () => {
  it("draws the image larger and shifted so its blank left column and bottom row fall outside", () => {
    const f = cropFrame(702, 414);
    expect(f.width).toBeCloseTo(720);
    expect(f.height).toBeCloseTo(432);
    expect(f.left).toBeCloseTo(-18);
    expect(f.top).toBe(0);
  });

  it("scales with the frame", () => {
    const f = cropFrame(351, 207);
    expect(f.width).toBeCloseTo(360);
    expect(f.left).toBeCloseTo(-9);
    // The visible part fills the frame exactly.
    expect(f.width + f.left).toBeCloseTo(351);
  });

  it("matches the documented image size", () => {
    expect(IMAGE).toEqual({ width: 720, height: 432, left: 18, bottom: 18 });
  });
});

describe("getLinkBoxes", () => {
  const W = 702;
  const H = 414;

  it("places a link over its three digits", () => {
    // Line 1: 5 blank columns, then "201" (columns 5–7 → ends at 8).
    const r = response({
      number: "200",
      subPages: [{ runs: [[[5], [3, "201"]]] }],
    });
    const [box] = getLinkBoxes(r, 1, W, H);
    expect(box.link).toBe("201");
    // Column 5 of 40 on the 720-wide image, shifted by the 18 px crop.
    expect(box.left).toBeCloseTo((5 / 40) * 720 - 18);
    expect(box.width).toBeCloseTo((3 / 40) * 720);
    expect(box.top).toBeCloseTo(0);
  });

  it("puts each structured line on its own row", () => {
    const r = response({
      number: "200",
      subPages: [
        { runs: [[[3, "201"]], [[3, "202"]], [[3, "203"]], [[3, "204"]]] },
      ],
    });
    const boxes = getLinkBoxes(r, 1, W, H);
    expect(boxes.map((b) => b.link)).toEqual(["201", "202", "203", "204"]);
    const rowHeight = boxes[1].top - boxes[0].top;
    expect(rowHeight).toBeGreaterThan(0);
    expect(boxes[3].top - boxes[2].top).toBeCloseTo(rowHeight);
  });

  it("ignores links that are not page numbers", () => {
    const r = response({
      subPages: [
        {
          runs: [
            [
              [3, "abc"],
              [3, "999"],
              [3, "12"],
              [3, "350"],
            ],
          ],
        },
      ],
    });
    expect(getLinkBoxes(r, 1, W, H).map((b) => b.link)).toEqual(["350"]);
  });

  it("uses the requested subpage", () => {
    const r = response({
      subPages: [{ runs: [[[3, "201"]]] }, { runs: [[[3, "301"]]] }],
    });
    expect(getLinkBoxes(r, 2, W, H).map((b) => b.link)).toEqual(["301"]);
  });

  it("returns nothing before layout or without data", () => {
    expect(getLinkBoxes(undefined, 1, W, H)).toEqual([]);
    expect(
      getLinkBoxes(response({ subPages: [{ runs: [[[3, "201"]]] }] }), 1, 0, 0),
    ).toEqual([]);
  });

  it("skips black-listed pages whose numbers aren't links", () => {
    const r = response({ number: "237", subPages: [{ runs: [[[3, "201"]]] }] });
    expect(getLinkBoxes(r, 1, W, H)).toEqual([]);
  });
});

describe("pageInset", () => {
  it("keeps edge text clear of rounded corners", () => {
    const r = 14;
    const inset = pageInset(r);
    // How far a corner of radius r cuts in along the diagonal.
    const cut = r * (1 - Math.SQRT1_2);
    expect(inset).toBeGreaterThanOrEqual(Math.ceil(cut));
  });

  it("adds no margin to square frames", () => {
    expect(pageInset(0)).toBe(0);
  });
});
