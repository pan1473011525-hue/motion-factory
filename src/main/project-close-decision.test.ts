import {describe, expect, it} from "vitest";
import {decideProjectCloseAction} from "./project-close-decision";

describe("decideProjectCloseAction", () => {
  it("closes directly when the project is clean", () => {
    expect(decideProjectCloseAction(false)).toBe("close");
  });

  it("maps the app prompt choices to save, discard, and cancel", () => {
    expect(decideProjectCloseAction(true, "save")).toBe("save");
    expect(decideProjectCloseAction(true, "discard")).toBe("discard");
    expect(decideProjectCloseAction(true, "cancel")).toBe("cancel");
  });

  it("cancels safely when the prompt response is missing or unknown", () => {
    expect(decideProjectCloseAction(true)).toBe("cancel");
  });
});
