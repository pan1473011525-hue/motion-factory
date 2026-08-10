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
  // motioner-scaffold:runtime-items
];

export const getRuntimeTemplate = (id: string): RuntimeDefinition => {
  const definition = runtimeTemplates.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`未安装模板：${id}`);
  return definition;
};
