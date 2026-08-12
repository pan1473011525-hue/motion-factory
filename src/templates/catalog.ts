import type {MotionProject} from "../../packages/project-model/src";
import {parseMotionProject} from "../../packages/project-model/src";
import {
  migrateTemplateProps,
  type TemplateManifest,
} from "../../packages/template-sdk/src";
import {statCounterManifest} from "./stat-counter/manifest";
import {dualMetricManifest} from "./dual-metric/manifest";
import {horizontalRankingManifest} from "./horizontal-ranking/manifest";
import {verticalBarsManifest} from "./vertical-bars/manifest";
import {lineTrendManifest} from "./line-trend/manifest";
import {donutShareManifest} from "./donut-share/manifest";
import {sourceCardManifest} from "./source-card/manifest";
import {quoteCardManifest} from "./quote-card/manifest";
import {timelineManifest} from "./timeline/manifest";
import {lowerThirdManifest} from "./lower-third/manifest";
import {mediaInfoManifest} from "./media-info/manifest";
import {mediaGridManifest} from "./media-grid/manifest";
import {alphaTestCardManifest} from "./alpha-test-card/manifest";
import {beforeAfterManifest} from "./before-after/manifest";
import {calloutAnnotationManifest} from "./callout-annotation/manifest";
import {mediaCarouselManifest} from "./media-carousel/manifest";
import {multiLineManifest} from "./multi-line/manifest";
import {newsTitleManifest} from "./news-title/manifest";
import {routeMapManifest} from "./route-map/manifest";
import {splitScreenManifest} from "./split-screen/manifest";
import {sportsScoreboardManifest} from "./sports-scoreboard/manifest";
import {stackedBarsManifest} from "./stacked-bars/manifest";
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
import {carousel3dManifest} from "./carousel-3d/manifest";
import {photoGridCollageManifest} from "./photo-grid-collage/manifest";
import {photoMasonryManifest} from "./photo-masonry/manifest";
import {photoRowStripManifest} from "./photo-row-strip/manifest";
import {polaroidPhotoManifest} from "./polaroid-photo/manifest";
import {spotlightPhotoManifest} from "./spotlight-photo/manifest";
import {archiveStackManifest} from "./archive-stack/manifest";
import {bookShelfManifest} from "./book-shelf/manifest";
import {documentCardManifest} from "./document-card/manifest";
import {sepiaAlbumManifest} from "./sepia-album/manifest";
// motioner-scaffold:manifest-imports

export type AnyTemplateManifest = TemplateManifest<Record<string, unknown>>;

const eraseManifestType = <Props extends Record<string, unknown>>(
  manifest: TemplateManifest<Props>,
): AnyTemplateManifest => manifest as unknown as AnyTemplateManifest;

export const templateCatalog: ReadonlyArray<AnyTemplateManifest> = [
  eraseManifestType(statCounterManifest),
  eraseManifestType(dualMetricManifest),
  eraseManifestType(horizontalRankingManifest),
  eraseManifestType(verticalBarsManifest),
  eraseManifestType(lineTrendManifest),
  eraseManifestType(donutShareManifest),
  eraseManifestType(sourceCardManifest),
  eraseManifestType(quoteCardManifest),
  eraseManifestType(timelineManifest),
  eraseManifestType(lowerThirdManifest),
  eraseManifestType(mediaInfoManifest),
  eraseManifestType(mediaGridManifest),
  eraseManifestType(alphaTestCardManifest),
  eraseManifestType(routeMapManifest),
  eraseManifestType(multiLineManifest),
  eraseManifestType(stackedBarsManifest),
  eraseManifestType(newsTitleManifest),
  eraseManifestType(sportsScoreboardManifest),
  eraseManifestType(calloutAnnotationManifest),
  eraseManifestType(mediaCarouselManifest),
  eraseManifestType(beforeAfterManifest),
  eraseManifestType(splitScreenManifest),
  eraseManifestType(transitionWipeBlindsManifest),
  eraseManifestType(transitionWipeClockManifest),
  eraseManifestType(transitionIrisManifest),
  eraseManifestType(transitionInkManifest),
  eraseManifestType(transitionGlitchManifest),
  eraseManifestType(transitionGradientLinearManifest),
  eraseManifestType(transitionGradientRadialManifest),
  eraseManifestType(transitionGradientConicManifest),
  eraseManifestType(typewriterTerminalManifest),
  eraseManifestType(typewriterRetypeManifest),
  eraseManifestType(textScrambleManifest),
  eraseManifestType(splitFlapManifest),
  eraseManifestType(gaugeReadoutManifest),
  eraseManifestType(odometerRollManifest),
  eraseManifestType(confettiCelebrateManifest),
  eraseManifestType(voiceWaveformManifest),
  eraseManifestType(listRevealManifest),
  eraseManifestType(cardStackManifest),
  eraseManifestType(skeletonRevealManifest),
  eraseManifestType(svgTraceManifest),
  eraseManifestType(karaokeFillManifest),
  eraseManifestType(grainDissolveManifest),
  eraseManifestType(scanlineAnnotateManifest),
  eraseManifestType(glowFlylineManifest),
  eraseManifestType(photoGridCollageManifest),
  eraseManifestType(photoMasonryManifest),
  eraseManifestType(photoRowStripManifest),
  eraseManifestType(carousel3dManifest),
  eraseManifestType(spotlightPhotoManifest),
  eraseManifestType(polaroidPhotoManifest),
  eraseManifestType(archiveStackManifest),
  eraseManifestType(bookShelfManifest),
  eraseManifestType(documentCardManifest),
  eraseManifestType(sepiaAlbumManifest),
  // motioner-scaffold:catalog-items
];

export const getTemplateManifest = (id: string): AnyTemplateManifest => {
  const manifest = templateCatalog.find((candidate) => candidate.id === id);
  if (!manifest) throw new Error(`未安装模板：${id}`);
  return manifest;
};

export const upgradeProjectTemplate = (project: MotionProject): MotionProject => {
  const manifest = getTemplateManifest(project.template.id);
  const props = migrateTemplateProps(manifest, project.template.version, project.props);
  return parseMotionProject({
    ...project,
    template: {id: manifest.id, version: manifest.version},
    props,
  });
};
