import {Composition} from "remotion";
import {z} from "zod";
import {MotionerComposition} from "../templates/runtime";
import {
  composerCompositionSchema,
  createEmptyComposerComposition,
  projectAnimationSchema,
  projectAssetSchema,
  projectTypographySchema,
} from "../../packages/project-model/src";

const motionerCompositionSchema = z.object({
  mode: z.enum(["template", "composer"]).optional(),
  templateId: z.string(),
  templateProps: z.record(z.string(), z.unknown()),
  composition: composerCompositionSchema.optional(),
  assets: z.array(projectAssetSchema.extend({src: z.string().optional()})),
  reviewBackground: z.string().optional(),
  motionSettings: projectAnimationSchema.optional(),
  typography: projectTypographySchema.optional(),
});

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MotionerComposition"
      component={MotionerComposition}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      schema={motionerCompositionSchema}
      defaultProps={{
        mode: "template",
        templateId: "stat-counter",
        templateProps: {
          title: "项目增长",
          value: 128.6,
          prefix: "",
          suffix: "%",
          source: "示例数据",
          decimals: 1,
          accentColor: "#47A7FF",
          stylePreset: "editorial",
        },
        assets: [],
        composition: createEmptyComposerComposition(),
        reviewBackground: undefined,
        motionSettings: undefined,
        typography: undefined,
      }}
    />
  );
};
