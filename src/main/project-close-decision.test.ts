import {describe, expect, it} from "vitest";
import {decideProjectCloseAction} from "./project-close-decision";

describe("decideProjectCloseAction", () => {
  it("closes directly when the project is clean", () => {
    expect(decideProjectCloseAction(false)).toBe("close");
  });

  it("maps the native prompt choices to save, discard, and cancel", () => {
    expect(decideProjectCloseAction(true, 0)).toBe("save");
    expect(decideProjectCloseAction(true, 1)).toBe("discard");
    expect(decideProjectCloseAction(true, 2)).toBe("cancel");
  });

  it("cancels safely when the prompt response is missing or unknown", () => {
    expect(decideProjectCloseAction(true)).toBe("cancel");
    expect(decideProjectCloseAction(true, 99)).toBe("cancel");
  });
});
