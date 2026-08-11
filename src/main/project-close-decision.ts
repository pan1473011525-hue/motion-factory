import type {CloseProjectDecision} from "../shared/contracts";

export type ProjectCloseAction = "close" | "save" | "discard" | "cancel";

export const decideProjectCloseAction = (
  hasUnsavedChanges: boolean,
  promptResponse?: CloseProjectDecision,
): ProjectCloseAction => {
  if (!hasUnsavedChanges) return "close";
  if (promptResponse === "save") return "save";
  if (promptResponse === "discard") return "discard";
  return "cancel";
};
