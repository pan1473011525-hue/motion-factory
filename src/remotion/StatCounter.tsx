import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {StatCounterProps} from "../templates/stat-counter/manifest";
import {formatStatValue, getCounterValueAtProgress} from "../shared/format-stat";
import {useCanvasUnit, useMotionSettings, useProjectFontFamily} from "./primitives";

export const StatCounter: React.FC<StatCounterProps> = ({
  title,
  value,
  prefix,
  suffix,
  source,
  decimals,
  accentColor,
  stylePreset,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps, width, height} = useVideoConfig();
  const motion = useMotionSettings();
  const canvasUnit = useCanvasUnit();
  const portrait = height > width * 1.18;
  const unit = portrait ? width / 1280 : canvasUnit;
  const fontFamily = useProjectFontFamily();
  const edgeFrames = Math.max(6, Math.round(motion.edgeFrames / motion.speed));
  const valueDensity = Math.max(1, `${prefix}${formatStatValue(value, decimals)}${suffix}`.length / 7);

  const numberProgress = motion.reducedMotion ? 1 : interpolate(frame, [12, 12 + 69 * fps / (30 * motion.speed)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const isMinimal = stylePreset === "minimal";
  const isSport = stylePreset === "sport";

  return (
    <AbsoluteFill
      name="Transparent canvas"
      style={{
        backgroundColor: "transparent",
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Statistic panel"
        style={{
          position: "absolute",
          left: 96 * unit,
          bottom: 96 * unit,
          width: `calc(100% - ${192 * unit}px)`,
          maxWidth: portrait ? undefined : 820 * unit,
          minHeight: 410 * unit,
          boxSizing: "border-box",
          padding: `${58 * unit}px ${64 * unit}px ${52 * unit}px`,
          borderRadius: (isSport ? 4 : 16) * unit,
          color: "white",
          backgroundColor: isMinimal ? "rgba(9, 12, 16, 0.62)" : isSport ? "rgba(5, 8, 10, 0.96)" : "rgba(13, 20, 28, 0.92)",
          border: isMinimal ? `${Math.max(1, unit)}px solid rgba(255,255,255,0.28)` : isSport ? `${Math.max(1, 2 * unit)}px solid ${accentColor}` : "none",
          boxShadow: "0 8px 8px rgba(0, 0, 0, 0.18)",
          opacity: interpolate(
            frame,
            [0, edgeFrames, durationInFrames - edgeFrames, durationInFrames - 1],
            [0, 1, 1, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [
                Easing.bezier(0.16, 1, 0.3, 1),
                Easing.linear,
                Easing.bezier(0.7, 0, 0.84, 0),
              ],
            },
          ),
          translate: motion.reducedMotion ? "0px 0px" : interpolate(
            frame,
            [0, edgeFrames, durationInFrames - edgeFrames, durationInFrames - 1],
            [`0px ${46 * unit}px`, "0px 0px", "0px 0px", `0px ${28 * unit}px`],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [
                Easing.bezier(0.16, 1, 0.3, 1),
                Easing.linear,
                Easing.bezier(0.7, 0, 0.84, 0),
              ],
            },
          ),
        }}
      >
        <Interactive.Div
          name="Accent rule"
          style={{
            width: motion.reducedMotion ? 112 * unit : interpolate(frame, [6, 6 + 22 / motion.speed], [0, 112 * unit], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            height: (isMinimal ? 3 : 8) * unit,
            borderRadius: 8 * unit,
            backgroundColor: accentColor,
            marginBottom: 28 * unit,
          }}
        />

        <Interactive.Div
          name="Title"
          style={{
            color: "rgba(255, 255, 255, 0.72)",
            fontSize: 46 * unit,
            fontWeight: 560,
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
            opacity: motion.reducedMotion ? 1 : interpolate(frame, [8, 8 + 16 / motion.speed], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {title}
        </Interactive.Div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginTop: 10 * unit,
            minHeight: 168 * unit,
            overflow: "hidden",
          }}
        >
          <Interactive.Div
            name="Value"
            style={{
              color: "white",
              fontSize: (isSport ? 180 : 168) * unit / Math.sqrt(valueDensity),
              fontStyle: isSport ? "italic" : "normal",
              fontWeight: 720,
              letterSpacing: "-0.035em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {prefix}{formatStatValue(
              getCounterValueAtProgress(value, numberProgress),
              decimals,
            )}
          </Interactive.Div>
          <Interactive.Div
            name="Suffix"
            style={{
              color: accentColor,
              fontSize: 72 * unit / Math.sqrt(valueDensity),
              fontWeight: 700,
              marginLeft: 18 * unit,
              lineHeight: 1,
            }}
          >
            {suffix}
          </Interactive.Div>
        </div>

        <Interactive.Div
          name="Source"
          style={{
            marginTop: 34 * unit,
            color: "rgba(255, 255, 255, 0.56)",
            fontSize: 28 * unit,
            fontWeight: 450,
            letterSpacing: "0.01em",
            lineHeight: 1.3,
            opacity: motion.reducedMotion ? 1 : interpolate(frame, [34, 34 + 16 / motion.speed], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {source ? `来源：${source}` : ""}
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
