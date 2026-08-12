import {describe, expect, it} from "vitest";
import {DEFAULT_SHORTCUT_BINDINGS, formatShortcut, getDefaultShortcutBindings, keyboardEventToChord, mergeShortcutBindings, shortcutConflicts} from "./shortcuts";

describe("keyboard shortcuts", () => {
  it("normalizes macOS modifier chords", () => {
    expect(keyboardEventToChord({code: "ArrowLeft", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false})).toBe("Meta+ArrowLeft");
    expect(keyboardEventToChord({code: "KeyM", metaKey: false, ctrlKey: false, altKey: false, shiftKey: true})).toBe("Shift+M");
  });

  it("detects conflicts before assigning a chord", () => {
    expect(shortcutConflicts(DEFAULT_SHORTCUT_BINDINGS, "add-segment", "M")).toBe("add-marker");
    expect(shortcutConflicts(DEFAULT_SHORTCUT_BINDINGS, "add-segment", "Shift+M")).toBeNull();
  });

  it("merges partial stored settings with new defaults", () => {
    const merged = mergeShortcutBindings({"toggle-playback": ["P"]});
    expect(merged["toggle-playback"]).toEqual(["P"]);
    expect(merged["timeline-start"]).toEqual(["Meta+ArrowLeft"]);
  });

  it("uses Windows Control shortcuts and Windows labels", () => {
    const defaults = getDefaultShortcutBindings("win32");
    expect(defaults["save-project"]).toEqual(["Control+S"]);
    expect(defaults["timeline-start"]).toEqual(["Control+ArrowLeft"]);
    expect(formatShortcut("Control+Shift+Z", "win32")).toBe("Ctrl+Shift+Z");
    expect(formatShortcut("Meta+Shift+Z", "darwin")).toBe("⌘⇧Z");
  });
});
