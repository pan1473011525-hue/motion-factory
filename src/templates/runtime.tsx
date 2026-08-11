import {AbsoluteFill} from "remotion";
import type {ComposerComposition as ComposerScene, TemplateAppearance} from "../../packages/project-model/src";
import {ComposerComposition} from "../composer/runtime";
import {MediaAssetProvider, MotionSettingsProvider, ProjectFontProvider, TemplateAppearanceProvider, type RuntimeAsset} from "../remotion/primitives";
import {getRuntimeTemplate} from "./definitions";

export {getRuntimeTemplate, runtimeTemplates} from "./definitions";

export type MotionerCompositionProps = {
  mode?: "template" | "composer";
  templateId: string;
  templateProps: Record<string, unknown>;
  composition?: ComposerScene;
  assets: RuntimeAsset[];
  reviewBackground?: string;
  motionSettings?: {speed: number; reducedMotion: boolean; edgeFrames: number};
  typography?: {fontAssetId: string; fallbackFamily: "system" | "serif" | "mono"};
  templateAppearance?: TemplateAppearance;
};

export const MotionerComposition: React.FC<MotionerCompositionProps> = ({
  mode = "template",
  templateId,
  templateProps,
  composition,
  assets,
  reviewBackground,
  motionSettings,
  typography,
  templateAppearance,
}) => {
  const definition = getRuntimeTemplate(templateId);
  const Component = definition.component;
  const props = definition.schema.parse(templateProps);
  return (
    <AbsoluteFill style={{backgroundColor: reviewBackground ?? "transparent"}}>
      <ProjectFontProvider key={typography?.fontAssetId ?? "default"} assets={assets} fontAssetId={typography?.fontAssetId} fallbackFamily={typography?.fallbackFamily}><MotionSettingsProvider settings={motionSettings}><MediaAssetProvider assets={assets}><TemplateAppearanceProvider appearance={templateAppearance}>{mode === "composer" && composition ? <ComposerComposition composition={composition} /> : <Component {...props} />}</TemplateAppearanceProvider></MediaAssetProvider></MotionSettingsProvider></ProjectFontProvider>
    </AbsoluteFill>
  );
};
