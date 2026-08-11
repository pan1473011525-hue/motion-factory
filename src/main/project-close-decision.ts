export type ProjectCloseAction = "close" | "save" | "discard" | "cancel";

export const decideProjectCloseAction = (
  hasUnsavedChanges: boolean,
  promptResponse?: number,
): ProjectCloseAction => {
  if (!hasUnsavedChanges) return "close";
  if (promptResponse === 0) return "save";
  if (promptResponse === 1) return "discard";
  return "cancel";
};
