export interface TextTvResponse {
  network: string;
  xml: string;
  page: TextTvPage;
}

export interface TextTvPage {
  number: string;
  name: string;
  time: string;
  subPageCount: string;
  nextPage?: string;
  prevPage?: string;
  topType: string;
  animated: string;
  subPages: TextTvSubPage[];
}

export interface TextTvSubPage {
  number: string;
  time: string;
  content: TextTVSubPageContent[];
}

export interface TextTVSubPageContent {
  type: "text" | "all" | "structured";
  line: Line[];
}

export interface Line {
  number: string;
  text?: string;
  run?: Run[];
}

export interface Run {
  background: string;
  foreground: string;
  charCode?: string;
  link?: string;
  size?: string;
  length: string;
  text?: string;
}
