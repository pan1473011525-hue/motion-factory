import {describe, expect, it, vi} from "vitest";
import {composerSelectionBoundarySelector, shouldPreserveComposerSelection} from "./composer-selection";

const elementMatching = (matchedSelector: string) => ({
  matches: vi.fn((selector: string) => selector.includes(matchedSelector)),
});

describe("composer selection boundary", () => {
  it("keeps the selected layer while choosing an option from a portalled select menu", () => {
    const menu = elementMatching("[data-preserve-composer-selection]");

    expect(shouldPreserveComposerSelection([{}, menu, globalThis])).toBe(true);
    expect(menu.matches).toHaveBeenCalledWith(composerSelectionBoundarySelector);
  });

  it("keeps existing editor interaction regions and clears unrelated clicks", () => {
    expect(shouldPreserveComposerSelection([elementMatching(".composer-timeline")])).toBe(true);
    expect(shouldPreserveComposerSelection([elementMatching(".inspector-panel")])).toBe(true);
    expect(shouldPreserveComposerSelection([elementMatching(".workspace-toolbar")])).toBe(false);
  });
});
