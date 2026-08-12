import type {ComponentType} from "react";
import {defineTemplate, type TemplateDefinition} from "../../packages/template-sdk/src";
import {StatCounter} from "../remotion/StatCounter";
import {
  DonutShare,
  DualMetric,
  HorizontalRanking,
  LineTrend,
  LowerThird,
  MediaGrid,
  MediaInfo,
  QuoteCard,
  SourceCard,
  Timeline,
  VerticalBars,
} from "../remotion/Templates";
import {
  AlphaTestCard,
  BeforeAfter,
  CalloutAnnotation,
  MediaCarousel,
  MultiLine,
  NewsTitle,
  RouteMap,
  SplitScreen,
  SportsScoreboard,
  StackedBars,
} from "../remotion/AdvancedTemplates";
import {TransitionWipeBlinds} from "../remotion/generated/transition-wipe-blinds";
import {TransitionWipeClock} from "../remotion/generated/transition-wipe-clock";
import {TransitionIris} from "../remotion/generated/transition-iris";
import {TransitionInk} from "../remotion/generated/transition-ink";
import {TransitionGlitch} from "../remotion/generated/transition-glitch";
import {TransitionGradientLinear} from "../remotion/generated/transition-gradient-linear";
import {TransitionGradientRadial} from "../remotion/generated/transition-gradient-radial";
import {TransitionGradientConic} from "../remotion/generated/transition-gradient-conic";
import {TypewriterTerminal} from "../remotion/generated/typewriter-terminal";
import {TypewriterRetype} from "../remotion/generated/typewriter-retype";
import {TextScramble} from "../remotion/generated/text-scramble";
import {SplitFlap} from "../remotion/generated/split-flap";
// motioner-scaffold:component-imports
import {alphaTestCardManifest} from "./alpha-test-card/manifest";
import {beforeAfterManifest} from "./before-after/manifest";
import {calloutAnnotationManifest} from "./callout-annotation/manifest";
import {donutShareManifest} from "./donut-share/manifest";
import {dualMetricManifest} from "./dual-metric/manifest";
import {horizontalRankingManifest} from "./horizontal-ranking/manifest";
import {lineTrendManifest} from "./line-trend/manifest";
import {lowerThirdManifest} from "./lower-third/manifest";
import {mediaCarouselManifest} from "./media-carousel/manifest";
import {mediaGridManifest} from "./media-grid/manifest";
import {mediaInfoManifest} from "./media-info/manifest";
import {multiLineManifest} from "./multi-line/manifest";
import {newsTitleManifest} from "./news-title/manifest";
import {quoteCardManifest} from "./quote-card/manifest";
import {routeMapManifest} from "./route-map/manifest";
import {sourceCardManifest} from "./source-card/manifest";
import {splitScreenManifest} from "./split-screen/manifest";
import {sportsScoreboardManifest} from "./sports-scoreboard/manifest";
import {stackedBarsManifest} from "./stacked-bars/manifest";
import {statCounterManifest} from "./stat-counter/manifest";
import {timelineManifest} from "./timeline/manifest";
import {verticalBarsManifest} from "./vertical-bars/manifest";
import {transitionWipeBlindsManifest} from "./transition-wipe-blinds/manifest";
import {transitionWipeClockManifest} from "./transition-wipe-clock/manifest";
import {transitionIrisManifest} from "./transition-iris/manifest";
import {transitionInkManifest} from "./transition-ink/manifest";
import {transitionGlitchManifest} from "./transition-glitch/manifest";
import {transitionGradientLinearManifest} from "./transition-gradient-linear/manifest";
import {transitionGradientRadialManifest} from "./transition-gradient-radial/manifest";
import {transitionGradientConicManifest} from "./transition-gradient-conic/manifest";
import {typewriterTerminalManifest} from "./typewriter-terminal/manifest";
import {typewriterRetypeManifest} from "./typewriter-retype/manifest";
import {textScrambleManifest} from "./text-scramble/manifest";
import {splitFlapManifest} from "./split-flap/manifest";
// motioner-scaffold:manifest-imports

export type RuntimeDefinition = TemplateDefinition<
  Record<string, unknown>,
  ComponentType<Record<string, unknown>>
>;

const eraseDefinitionType = <Props extends Record<string, unknown>>(
  definition: TemplateDefinition<Props, ComponentType<Props>>,
): RuntimeDefinition => definition as unknown as RuntimeDefinition;

export const runtimeTemplates: ReadonlyArray<RuntimeDefinition> = [
  eraseDefinitionType(defineTemplate({...statCounterManifest, component: StatCounter})),
  eraseDefinitionType(defineTemplate({...dualMetricManifest, component: DualMetric})),
  eraseDefinitionType(defineTemplate({...horizontalRankingManifest, component: HorizontalRanking})),
  eraseDefinitionType(defineTemplate({...verticalBarsManifest, component: VerticalBars})),
  eraseDefinitionType(defineTemplate({...lineTrendManifest, component: LineTrend})),
  eraseDefinitionType(defineTemplate({...donutShareManifest, component: DonutShare})),
  eraseDefinitionType(defineTemplate({...sourceCardManifest, component: SourceCard})),
  eraseDefinitionType(defineTemplate({...quoteCardManifest, component: QuoteCard})),
  eraseDefinitionType(defineTemplate({...timelineManifest, component: Timeline})),
  eraseDefinitionType(defineTemplate({...lowerThirdManifest, component: LowerThird})),
  eraseDefinitionType(defineTemplate({...mediaInfoManifest, component: MediaInfo})),
  eraseDefinitionType(defineTemplate({...mediaGridManifest, component: MediaGrid})),
  eraseDefinitionType(defineTemplate({...alphaTestCardManifest, component: AlphaTestCard})),
  eraseDefinitionType(defineTemplate({...routeMapManifest, component: RouteMap})),
  eraseDefinitionType(defineTemplate({...multiLineManifest, component: MultiLine})),
  eraseDefinitionType(defineTemplate({...stackedBarsManifest, component: StackedBars})),
  eraseDefinitionType(defineTemplate({...newsTitleManifest, component: NewsTitle})),
  eraseDefinitionType(defineTemplate({...sportsScoreboardManifest, component: SportsScoreboard})),
  eraseDefinitionType(defineTemplate({...calloutAnnotationManifest, component: CalloutAnnotation})),
  eraseDefinitionType(defineTemplate({...mediaCarouselManifest, component: MediaCarousel})),
  eraseDefinitionType(defineTemplate({...beforeAfterManifest, component: BeforeAfter})),
  eraseDefinitionType(defineTemplate({...splitScreenManifest, component: SplitScreen})),
  eraseDefinitionType(defineTemplate({...transitionWipeBlindsManifest, component: TransitionWipeBlinds})),
  eraseDefinitionType(defineTemplate({...transitionWipeClockManifest, component: TransitionWipeClock})),
  eraseDefinitionType(defineTemplate({...transitionIrisManifest, component: TransitionIris})),
  eraseDefinitionType(defineTemplate({...transitionInkManifest, component: TransitionInk})),
  eraseDefinitionType(defineTemplate({...transitionGlitchManifest, component: TransitionGlitch})),
  eraseDefinitionType(defineTemplate({...transitionGradientLinearManifest, component: TransitionGradientLinear})),
  eraseDefinitionType(defineTemplate({...transitionGradientRadialManifest, component: TransitionGradientRadial})),
  eraseDefinitionType(defineTemplate({...transitionGradientConicManifest, component: TransitionGradientConic})),
  eraseDefinitionType(defineTemplate({...typewriterTerminalManifest, component: TypewriterTerminal})),
  eraseDefinitionType(defineTemplate({...typewriterRetypeManifest, component: TypewriterRetype})),
  eraseDefinitionType(defineTemplate({...textScrambleManifest, component: TextScramble})),
  eraseDefinitionType(defineTemplate({...splitFlapManifest, component: SplitFlap})),
  // motioner-scaffold:runtime-items
];

export const getRuntimeTemplate = (id: string): RuntimeDefinition => {
  const definition = runtimeTemplates.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`未安装模板：${id}`);
  return definition;
};
