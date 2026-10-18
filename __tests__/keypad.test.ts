import { pressKey } from "../src/components/home/keypad";

const type = (keys: string[]) => {
  let digits = "";
  let last;
  for (const k of keys) {
    last = pressKey(digits, k);
    if (last.type === "typing") {
      digits = last.digits;
    } else {
      digits = "";
    }
  }
  return last;
};

describe("pressKey", () => {
  it("opens the page on the third digit", () => {
    expect(type(["2", "0", "1"])).toEqual({ type: "submit", page: "201" });
  });

  it("collects digits until then", () => {
    expect(pressKey("", "2")).toEqual({ type: "typing", digits: "2" });
    expect(pressKey("2", "0")).toEqual({ type: "typing", digits: "20" });
  });

  it("rejects numbers outside 100–899", () => {
    expect(type(["9", "9", "9"])).toEqual({ type: "invalid" });
    expect(type(["0", "5", "0"])).toEqual({ type: "invalid" });
  });

  it("deletes with backspace, also when empty", () => {
    expect(pressKey("20", "back")).toEqual({ type: "typing", digits: "2" });
    expect(pressKey("", "back")).toEqual({ type: "typing", digits: "" });
  });

  it("goes to the front page with the home key", () => {
    expect(pressKey("2", "home")).toEqual({ type: "submit", page: "100" });
  });
});
