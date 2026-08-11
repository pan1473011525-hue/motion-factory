export type ResolutionTier = "1k" | "2k" | "4k";
export type CanvasOrientation = "landscape" | "portrait";

export const RESOLUTION_TIERS: ReadonlyArray<{id: ResolutionTier; label: string; width: number; height: number}> = [
  {id: "1k", label: "1K", width: 1920, height: 1080},
  {id: "2k", label: "2K", width: 2560, height: 1440},
  {id: "4k", label: "4K", width: 3840, height: 2160},
];

export const getCanvasOrientation = (width: number, height: number): CanvasOrientation =>
  height > width ? "portrait" : "landscape";

export const getPresetDimensions = (tier: ResolutionTier, orientation: CanvasOrientation): {width: number; height: number} => {
  const preset = RESOLUTION_TIERS.find((candidate) => candidate.id === tier) ?? RESOLUTION_TIERS[0]!;
  return orientation === "portrait"
    ? {width: preset.height, height: preset.width}
    : {width: preset.width, height: preset.height};
};

export const getResolutionTier = (width: number, height: number): ResolutionTier | null => {
  const orientation = getCanvasOrientation(width, height);
  return RESOLUTION_TIERS.find((preset) => {
    const dimensions = getPresetDimensions(preset.id, orientation);
    return dimensions.width === width && dimensions.height === height;
  })?.id ?? null;
};
