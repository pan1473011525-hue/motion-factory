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
import {GaugeReadout} from "../remotion/generated/gauge-readout";
import {OdometerRoll} from "../remotion/generated/odometer-roll";
import {ConfettiCelebrate} from "../remotion/generated/confetti-celebrate";
import {VoiceWaveform} from "../remotion/generated/voice-waveform";
import {ListReveal} from "../remotion/generated/list-reveal";
import {CardStack} from "../remotion/generated/card-stack";
import {SkeletonReveal} from "../remotion/generated/skeleton-reveal";
import {SvgTrace} from "../remotion/generated/svg-trace";
import {KaraokeFill} from "../remotion/generated/karaoke-fill";
import {GrainDissolve} from "../remotion/generated/grain-dissolve";
import {ScanlineAnnotate} from "../remotion/generated/scanline-annotate";
import {GlowFlyline} from "../remotion/generated/glow-flyline";
import {PhotoGridCollage} from "../remotion/generated/photo-grid-collage";
import {PhotoMasonry} from "../remotion/generated/photo-masonry";
import {PhotoRowStrip} from "../remotion/generated/photo-row-strip";
import {Carousel3d} from "../remotion/generated/carousel-3d";
import {SpotlightPhoto} from "../remotion/generated/spotlight-photo";
import {PolaroidPhoto} from "../remotion/generated/polaroid-photo";
import {ArchiveStack} from "../remotion/generated/archive-stack";
import {BookShelf} from "../remotion/generated/book-shelf";
import {DocumentCard} from "../remotion/generated/document-card";
import {SepiaAlbum} from "../remotion/generated/sepia-album";
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
import {gaugeReadoutManifest} from "./gauge-readout/manifest";
import {odometerRollManifest} from "./odometer-roll/manifest";
import {confettiCelebrateManifest} from "./confetti-celebrate/manifest";
import {voiceWaveformManifest} from "./voice-waveform/manifest";
import {listRevealManifest} from "./list-reveal/manifest";
import {cardStackManifest} from "./card-stack/manifest";
import {skeletonRevealManifest} from "./skeleton-reveal/manifest";
import {svgTraceManifest} from "./svg-trace/manifest";
import {karaokeFillManifest} from "./karaoke-fill/manifest";
import {grainDissolveManifest} from "./grain-dissolve/manifest";
import {scanlineAnnotateManifest} from "./scanline-annotate/manifest";
import {glowFlylineManifest} from "./glow-flyline/manifest";
import {photoGridCollageManifest} from "./photo-grid-collage/manifest";
import {photoMasonryManifest} from "./photo-masonry/manifest";
import {photoRowStripManifest} from "./photo-row-strip/manifest";
import {carousel3dManifest} from "./carousel-3d/manifest";
import {spotlightPhotoManifest} from "./spotlight-photo/manifest";
import {polaroidPhotoManifest} from "./polaroid-photo/manifest";
import {archiveStackManifest} from "./archive-stack/manifest";
import {bookShelfManifest} from "./book-shelf/manifest";
import {documentCardManifest} from "./document-card/manifest";
import {sepiaAlbumManifest} from "./sepia-album/manifest";
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
  eraseDefinitionType(defineTemplate({...gaugeReadoutManifest, component: GaugeReadout})),
  eraseDefinitionType(defineTemplate({...odometerRollManifest, component: OdometerRoll})),
  eraseDefinitionType(defineTemplate({...confettiCelebrateManifest, component: ConfettiCelebrate})),
  eraseDefinitionType(defineTemplate({...voiceWaveformManifest, component: VoiceWaveform})),
  eraseDefinitionType(defineTemplate({...listRevealManifest, component: ListReveal})),
  eraseDefinitionType(defineTemplate({...cardStackManifest, component: CardStack})),
  eraseDefinitionType(defineTemplate({...skeletonRevealManifest, component: SkeletonReveal})),
  eraseDefinitionType(defineTemplate({...svgTraceManifest, component: SvgTrace})),
  eraseDefinitionType(defineTemplate({...karaokeFillManifest, component: KaraokeFill})),
  eraseDefinitionType(defineTemplate({...grainDissolveManifest, component: GrainDissolve})),
  eraseDefinitionType(defineTemplate({...scanlineAnnotateManifest, component: ScanlineAnnotate})),
  eraseDefinitionType(defineTemplate({...glowFlylineManifest, component: GlowFlyline})),
  eraseDefinitionType(defineTemplate({...photoGridCollageManifest, component: PhotoGridCollage})),
  eraseDefinitionType(defineTemplate({...photoMasonryManifest, component: PhotoMasonry})),
  eraseDefinitionType(defineTemplate({...photoRowStripManifest, component: PhotoRowStrip})),
  eraseDefinitionType(defineTemplate({...carousel3dManifest, component: Carousel3d})),
  eraseDefinitionType(defineTemplate({...spotlightPhotoManifest, component: SpotlightPhoto})),
  eraseDefinitionType(defineTemplate({...polaroidPhotoManifest, component: PolaroidPhoto})),
  eraseDefinitionType(defineTemplate({...archiveStackManifest, component: ArchiveStack})),
  eraseDefinitionType(defineTemplate({...bookShelfManifest, component: BookShelf})),
  eraseDefinitionType(defineTemplate({...documentCardManifest, component: DocumentCard})),
  eraseDefinitionType(defineTemplate({...sepiaAlbumManifest, component: SepiaAlbum})),
  // motioner-scaffold:runtime-items
];

export const getRuntimeTemplate = (id: string): RuntimeDefinition => {
  const definition = runtimeTemplates.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`未安装模板：${id}`);
  return definition;
};
