import {
  Line,
  Run,
  TextTvPage,
  TextTvResponse,
  TextTvSubPage,
  TextTVSubPageContent,
} from "../types/response";

export const mapTextTvResponse = (response: any): TextTvResponse => {
  return {
    network: response.teletext.network,
    xml: response.teletext.xml,
    page: mapTextTvPage(response.teletext.page),
  };
};

const mapTextTvPage = (page: any): TextTvPage => {
  return {
    number: page.number,
    name: page.name,
    time: page.time,
    subPageCount: page.subpagecount,
    nextPage: page.nextpg,
    prevPage: page.prevpg,
    topType: page.toptype,
    animated: page.animated,
    subPages: mapTextTvSubPages(page.subpage),
  };
};

const mapTextTvSubPages = (subPages: any): TextTvSubPage[] => {
  return subPages.map((subPage: any) => {
    return {
      number: subPage.number,
      time: subPage.time,
      content: mapTextTvSubPageContent(subPage.content),
    };
  });
};

const mapTextTvSubPageContent = (contents: any): TextTVSubPageContent[] => {
  return contents.map((content: any) => {
    return {
      type: content.type,
      line: mapLines(content.line),
    };
  });
};

const mapLines = (lines: any): Line => {
  return lines.map((line: any) => {
    return {
      number: line.number,
      text: line.Text,
      run: mapRuns(line.run),
    };
  });
};

const mapRuns = (runs?: any): Run[] => {
  if (!runs) {
    return [];
  }

  if (runs.bg || runs.fg) {
    return [toRun(runs)];
  }

  return runs.map(toRun);
};

const toRun = (run: any): Run => {
  return {
    background: run.bg,
    foreground: run.fg,
    charCode: run.charcode,
    link: run.link,
    size: run.size,
    length: run.length,
    text: run.Text,
  };
};
