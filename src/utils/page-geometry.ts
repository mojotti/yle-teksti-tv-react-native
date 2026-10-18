import { TextTvResponse, Run } from "../types/response";
import { isBlackListedPage, isValidPage } from ".";

/**
 * Yle's page images are 720 × 432 with a blank 18 px column on the left and
 * an 18 px row at the bottom (teletext's empty first column and last row).
 * The app crops them so the page sits evenly in its frame.
 */
export const IMAGE = { width: 720, height: 432, left: 18, bottom: 18 };
const VISIBLE_W = IMAGE.width - IMAGE.left;
const VISIBLE_H = IMAGE.height - IMAGE.bottom;
const COLUMNS = 40;

/** Where to draw the full image so only the visible part fills `w` × `h`. */
export const cropFrame = (w: number, h: number) => ({
  width: (w * IMAGE.width) / VISIBLE_W,
  height: (h * IMAGE.height) / VISIBLE_H,
  left: -(w * IMAGE.left) / VISIBLE_W,
  top: 0,
});

/**
 * Black margin inside a rounded page frame, so the cropped page's edge text
 * clears the corners (a corner of radius r cuts about 0.3·r on the diagonal).
 */
export const pageInset = (radius: number) => Math.ceil(radius * 0.35);

/** A horizontal position on the full image (0–1) in the cropped frame. */
const mapX = (fraction: number, w: number) =>
  ((fraction * IMAGE.width - IMAGE.left) / VISIBLE_W) * w;
/** A vertical position on the full image (0–1) in the cropped frame. */
const mapY = (fraction: number, h: number) =>
  ((fraction * IMAGE.height) / VISIBLE_H) * h;

export type LinkBox = {
  link: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

/**
 * Tap areas for the page numbers printed on a subpage, from the API's
 * structured lines (each run's length gives its column).
 */
export const getLinkBoxes = (
  response: TextTvResponse | undefined,
  subPage: number,
  w: number,
  h: number,
): LinkBox[] => {
  if (!response || isBlackListedPage(response.page.number) || !w || !h) {
    return [];
  }
  const lines =
    response.page.subPages[subPage - 1]?.content?.find(
      (c) => c.type === "structured",
    )?.line ?? [];
  const rows = lines.length || 1;
  const boxes: LinkBox[] = [];

  lines.forEach((line, row) => {
    let column = 0;
    (line.run ?? []).forEach((run: Run) => {
      column += Number(run.length);
      if (run.link && isValidPage(run.link)) {
        const left = mapX((column - 3) / COLUMNS, w);
        const right = mapX(column / COLUMNS, w);
        const top = mapY(row / rows, h);
        const bottom = mapY((row + 1) / rows, h);
        boxes.push({
          link: run.link,
          left,
          top,
          width: right - left,
          height: bottom - top,
        });
      }
    });
  });
  return boxes;
};
