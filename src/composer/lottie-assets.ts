// 内置 Lottie 动效资产清单（自产，MIT 项目内分发，无第三方署名义务）
// 全部为确定性几何动画，动画关键帧带 i/o 缓动（lottie-web 对省略 i/o 的渲染异常，勿改回）
import type {LottieAnimationData} from "@remotion/lottie";
import loaderRing from "../../public/lottie/loader-ring.json";
import loaderDots from "../../public/lottie/loader-dots.json";
import checkPop from "../../public/lottie/check-pop.json";
import heartPop from "../../public/lottie/heart-pop.json";
import playButton from "../../public/lottie/play-button.json";
import pulseWave from "../../public/lottie/pulse-wave.json";
import arrowRight from "../../public/lottie/arrow-right.json";

export type LottieAsset = {
  id: string;
  name: string;
  category: "loading" | "feedback" | "decor";
  description: string;
  data: LottieAnimationData;
};

export const lottieAssets: ReadonlyArray<LottieAsset> = [
  {id: "loader-ring", name: "加载圆环", category: "loading", description: "带缺口圆环匀速旋转的加载指示。", data: loaderRing as unknown as LottieAnimationData},
  {id: "loader-dots", name: "加载三点", category: "loading", description: "三个圆点错峰上下弹跳的加载指示。", data: loaderDots as unknown as LottieAnimationData},
  {id: "pulse-wave", name: "声波扩散", category: "decor", description: "同心圆波纹向外扩散的声波/信号效果。", data: pulseWave as unknown as LottieAnimationData},
  {id: "check-pop", name: "成功勾选", category: "feedback", description: "圆形弹出后勾选描边生长，成功反馈。", data: checkPop as unknown as LottieAnimationData},
  {id: "heart-pop", name: "点赞心形", category: "feedback", description: "心形弹出并回弹的点赞反馈。", data: heartPop as unknown as LottieAnimationData},
  {id: "play-button", name: "播放按钮", category: "feedback", description: "圆环与三角播放键的播放反馈。", data: playButton as unknown as LottieAnimationData},
  {id: "arrow-right", name: "右向箭头", category: "decor", description: "箭头滑入并微调强调的右向指示。", data: arrowRight as unknown as LottieAnimationData},
];

export const getLottieAsset = (id: string): LottieAsset =>
  lottieAssets.find((asset) => asset.id === id) ?? lottieAssets[0];
