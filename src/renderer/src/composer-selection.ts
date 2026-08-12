export const composerSelectionBoundarySelector = [
  ".composer-canvas-overlay",
  ".composer-timeline",
  ".component-library",
  ".inspector-panel",
  "[data-preserve-composer-selection]",
].join(", ");

type SelectorMatcher = {
  matches: (selector: string) => boolean;
};

const canMatchSelector = (candidate: unknown): candidate is SelectorMatcher => {
  if (typeof candidate !== "object" || candidate === null) return false;
  return "matches" in candidate && typeof candidate.matches === "function";
};

export const shouldPreserveComposerSelection = (path: readonly unknown[]): boolean => path.some(
  (candidate) => canMatchSelector(candidate) && candidate.matches(composerSelectionBoundarySelector),
);
