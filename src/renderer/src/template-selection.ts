export type TemplateSelectionAction = "replay" | "switch-and-replay";

export const getTemplateSelectionAction = (
  currentTemplateId: string,
  nextTemplateId: string,
): TemplateSelectionAction => currentTemplateId === nextTemplateId ? "replay" : "switch-and-replay";
