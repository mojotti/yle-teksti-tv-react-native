import { TextTvResponse } from "../src/types/response";

type SubPageSpec = {
  /** First text lines (headings). */
  text?: (string | undefined)[];
  /** Structured lines: each run is [length, link?]. */
  runs?: [number, string?][][];
};

/** Builds a mapped API response for tests. */
export const response = (
  opts: {
    number?: string;
    name?: string;
    prev?: string;
    next?: string;
    time?: string;
    subPages?: SubPageSpec[];
  } = {},
): TextTvResponse => {
  const subPages = opts.subPages ?? [
    { text: ["   ULKOMAAT        YLE  SUNNUNTAI"] },
  ];
  return {
    network: "",
    xml: "",
    page: {
      number: opts.number ?? "135",
      name: opts.name ?? "",
      time: opts.time ?? "2026-10-18T09:04:58",
      subPageCount: String(subPages.length),
      prevPage: opts.prev,
      nextPage: opts.next,
      topType: "",
      animated: "",
      subPages: subPages.map((sp, i) => ({
        number: String(i + 1),
        time: "15",
        content: [
          {
            type: "text" as const,
            line: (sp.text ?? []).map((t, n) => ({
              number: String(n + 1),
              text: t,
            })),
          },
          {
            type: "structured" as const,
            line: (sp.runs ?? []).map((line, n) => ({
              number: String(n + 1),
              run: line.map(([length, link]) => ({
                background: "",
                foreground: "",
                length: String(length),
                link,
              })),
            })),
          },
        ],
      })),
    },
  };
};

/** The raw JSON the API returns, for fetch mocks. */
export const apiJson = (
  number: string,
  opts: { prev?: string; next?: string; subPages?: number; name?: string } = {},
) => ({
  teletext: {
    network: "",
    xml: "",
    page: {
      number,
      name: opts.name ?? "",
      time: "2026-10-18T09:04:58",
      subpagecount: String(opts.subPages ?? 1),
      prevpg: opts.prev,
      nextpg: opts.next,
      toptype: "",
      animated: "",
      subpage: Array.from({ length: opts.subPages ?? 1 }, (_, i) => ({
        number: String(i + 1),
        time: "15",
        content: [
          {
            type: "text",
            line: [{ number: "1", Text: `   OTSIKKO ${number}/${i + 1}` }],
          },
        ],
      })),
    },
  },
});
