import {describe, expect, it} from "vitest";
import {getTemplateSelectionAction} from "./template-selection";

describe("template selection preview", () => {
  it("replays the currently selected template", () => {
    expect(getTemplateSelectionAction("donut-share", "donut-share")).toBe("replay");
  });

  it("switches and then replays a different template", () => {
    expect(getTemplateSelectionAction("donut-share", "horizontal-ranking")).toBe("switch-and-replay");
  });
});
