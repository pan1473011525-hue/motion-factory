const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;

export const safeFileStem = (
  value: string,
  fallback = "Motioner-导出",
  maxLength = 72,
): string => {
  const sanitized = value.trim()
    .replace(/[\\/:*?"<>|]+/gu, "-")
    .replace(/\s+/gu, " ")
    .slice(0, maxLength)
    .replace(/[. ]+$/gu, "");
  const stem = sanitized || fallback;
  return WINDOWS_RESERVED_NAME.test(stem) ? `_${stem}` : stem;
};
