export const formatStatValue = (
  value: number,
  decimals: number,
  locale = "zh-CN",
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(value);
};

export const getCounterValueAtProgress = (
  targetValue: number,
  progress: number,
): number => {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return targetValue * clampedProgress;
};
