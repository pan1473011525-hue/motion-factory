import type {ComposerComposition, ComposerNode, FrameRate} from "../../packages/project-model/src";

/**
 * Lottie 导出序列化器(POC 子集)。
 *
 * 把 Composer 场景映射为 Lottie JSON(https://lottiefiles.github.io/lottie-docs/)。
 * 支持的可表达子集:
 *  - 矩形 / 圆形 → shape layer(rect / ellipse + 填充色)
 *  - 文字类组件(标题/正文/引语/标签/人名条等)→ text layer(系统字体)
 *  - transform:位置 / 锚点 / 缩放 / 旋转 / 不透明度
 *  - timing:from/durationInFrames → layer 的 inPoint/outPoint
 *  - 动效:入场/退场 fade(不透明度关键帧)、rise/drop/slide(位置关键帧)、scale/pop(缩放关键帧);
 *    其余预设与循环动效暂不表达(降级为无动画),图片/视频/图表等图层跳过。
 *
 * 不引入第三方运行时,直接输出标准 Lottie JSON 结构,由测试断言关键字段。
 */

type LottieLayer = Record<string, unknown>;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const colorToLottie = (hex: string): [number, number, number] => {
  const value = hex.replace("#", "");
  if (value.length !== 6) return [1, 1, 1];
  const red = Number.parseInt(value.slice(0, 2), 16) / 255;
  const green = Number.parseInt(value.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255;
  return [red, green, blue];
};

const firstString = (props: Record<string, unknown>, keys: readonly string[]): string => {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

const textNodes = new Set(["title", "body-text", "quote", "badge", "callout", "lower-third"]);
const shapeNodes = new Set(["rectangle", "ellipse"]);

const toHexColor = (props: Record<string, unknown>): string => {
  const candidate = props.backgroundColor ?? props.accentColor ?? props.textColor ?? props.color;
  return typeof candidate === "string" && /^#[0-9a-fA-F]{6}$/u.test(candidate) ? candidate : "#FFFFFF";
};

export type LottieExportResult = {
  json: Record<string, unknown>;
  warnings: string[];
};

export const buildLottieExport = (
  composition: ComposerComposition,
  canvas: {width: number; height: number; fps: FrameRate},
  durationInFrames: number,
): LottieExportResult => {
  const warnings: string[] = [];
  const fps = canvas.fps.numerator / canvas.fps.denominator;
  const layers: LottieLayer[] = [];
  // Lottie layers 数组:靠前的层显示在下方;zIndex 升序排列,保证高 zIndex 在上。
  const ordered = [...composition.nodes]
    .filter((node) => !node.hidden)
    .sort((a, b) => a.transform.zIndex - b.transform.zIndex);

  for (const node of ordered) {
    const layer = buildNodeLayer(node, canvas, durationInFrames, warnings);
    if (layer) layers.push(layer);
  }

  const json = {
    v: "5.7.4",
    fr: Math.round(fps * 100) / 100,
    ip: 0,
    op: Math.max(1, durationInFrames),
    w: canvas.width,
    h: canvas.height,
    nm: "Motioner 导出",
    ddd: 0,
    assets: [],
    layers,
  };

  return {json, warnings};
};

const buildNodeLayer = (
  node: ComposerNode,
  canvas: {width: number; height: number; fps: FrameRate},
  durationInFrames: number,
  warnings: string[],
): LottieLayer | null => {
  const nodeWidth = Math.max(1, node.transform.width * canvas.width);
  const nodeHeight = Math.max(1, node.transform.height * canvas.height);
  const anchorX = node.transform.anchorX * nodeWidth;
  const anchorY = node.transform.anchorY * nodeHeight;
  const positionX = node.transform.x * canvas.width + anchorX;
  const positionY = node.transform.y * canvas.height + anchorY;

  const timing = {
    ip: Math.max(0, Math.round(node.timing.from)),
    op: Math.max(1, Math.round(node.timing.from + node.timing.durationInFrames)),
  };

  const props = (node.props ?? {}) as Record<string, unknown>;
  const transform = buildTransform(node, positionX, positionY, anchorX, anchorY, warnings);

  let layer: LottieLayer | null = null;

  if (shapeNodes.has(node.componentId)) {
    const fill = colorToLottie(toHexColor(props));
    const shape = node.componentId === "ellipse"
      ? {ty: "el", d: 1, p: {a: 0, k: [nodeWidth / 2, nodeHeight / 2]}, s: {a: 0, k: [nodeWidth, nodeHeight]}}
      : {ty: "rc", d: 1, p: {a: 0, k: [nodeWidth / 2, nodeHeight / 2]}, s: {a: 0, k: [nodeWidth, nodeHeight]}, r: {a: 0, k: 0}};
    layer = {
      ddd: 0,
      ind: node.transform.zIndex + 1,
      ty: 4,
      nm: node.name,
      sr: 1,
      ks: transform,
      ao: 0,
      shapes: [
        {ty: "gr", nm: "形状", it: [shape, {ty: "fl", c: {a: 0, k: fill}, o: {a: 0, k: 100}, r: 1}, {ty: "tr", p: {a: 0, k: [0, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 0}, o: {a: 0, k: 100}}]},
      ],
      ...timing,
    };
  } else if (textNodes.has(node.componentId)) {
    const text = firstString(props, ["title", "text", "body", "name", "label", "value"]);
    if (text) {
      const fontSize = Math.max(10, Math.round(nodeHeight * 0.45));
      const textColor = colorToLottie(typeof props.textColor === "string" ? props.textColor : "#F4F7FB");
      layer = {
        ddd: 0,
        ind: node.transform.zIndex + 1,
        ty: 5,
        nm: node.name,
        sr: 1,
        ks: transform,
        ao: 0,
        t: {
          d: {
            k: [{
              s: {
                s: fontSize,
                f: "Arial",
                t: text,
                j: 2,
                tr: 0,
                lh: Math.round(fontSize * 1.2),
                ls: 0,
                fc: textColor,
              },
              t: 0,
            }],
          },
          p: {},
          m: {g: 1, a: {a: 0, k: [0, 0]}},
          a: {a: 0, k: [0, 0, 0]},
        },
        ...timing,
      };
    } else {
      warnings.push(`「${node.name}」无文本内容,已跳过`);
    }
  } else {
    warnings.push(`「${node.name}」组件类型 ${node.componentId} 暂不支持 Lottie 导出,已跳过`);
  }

  return layer;
};

const buildTransform = (
  node: ComposerNode,
  positionX: number,
  positionY: number,
  anchorX: number,
  anchorY: number,
  warnings: string[],
): Record<string, unknown> => {
  const motion = node.motion;
  const mix = motion.mix ?? {enter: 1, exit: 1, loop: 1};
  const baseOpacity = Math.round(clamp((node.transform.opacity ?? 1) * 100, 0, 100));
  const baseScale = 100;
  const baseRotation = node.transform.rotation ?? 0;

  const from = node.timing.from;
  const exitFrames = motion.exitDuration ?? 15;
  const exitStart = Math.max(from, node.timing.from + node.timing.durationInFrames - exitFrames);

  const positionKeyframes: Array<Record<string, unknown>> = [];
  const scaleKeyframes: Array<Record<string, unknown>> = [];
  const opacityKeyframes: Array<Record<string, unknown>> = [];

  const unsupportedEasingPhases = [
    motion.enter !== "none" && mix.enter > 0 && motion.enterEasing !== "linear" ? "入场" : null,
    motion.exit !== "none" && mix.exit > 0 && motion.exitEasing !== "linear" ? "退场" : null,
  ].filter((phase): phase is string => phase !== null);
  if (unsupportedEasingPhases.length > 0) {
    // Lottie POC currently emits transform keyframes without temporal Bezier handles.
    // Keep the export usable, but make the visual fallback explicit instead of silently diverging.
    warnings.push(`「${node.name}」${unsupportedEasingPhases.join("、")}曲线在 Lottie 中暂按线性插值导出`);
  }

  // 入场(权重 > 0 且预设可表达)
  if (motion.enter !== "none" && mix.enter > 0) {
    const preset = motion.enter;
    const enterWeight = mix.enter;
    const offset = 120 * (1 - enterWeight); // 权重越低,位移越小
    let fromX = positionX;
    let fromY = positionY;
    let fromScale = baseScale;
    if (preset === "rise") fromY = positionY + 120 * enterWeight + offset;
    if (preset === "drop") fromY = positionY - 120 * enterWeight - offset;
    if (preset === "slide-left") fromX = positionX - 180 * enterWeight - offset;
    if (preset === "slide-right") fromX = positionX + 180 * enterWeight + offset;
    if (preset === "scale" || preset === "pop") fromScale = Math.round((0.62 + 0.38 * enterWeight) * 100);
    if (preset === "fade" || preset === "rise" || preset === "drop" || preset === "slide-left" || preset === "slide-right" || preset === "scale" || preset === "pop") {
      if (preset === "fade") {
        opacityKeyframes.push({t: from, s: [Math.round(baseOpacity * (1 - enterWeight))], h: 0});
      } else {
        positionKeyframes.push({t: from, s: [fromX, fromY, 0], h: 0});
        opacityKeyframes.push({t: from, s: [Math.round(baseOpacity * (1 - enterWeight * 0.5))], h: 0});
        if (preset === "scale" || preset === "pop") {
          scaleKeyframes.push({t: from, s: [fromScale, fromScale, 100], h: 0});
        }
      }
    }
  }

  // 退场
  if (motion.exit !== "none" && mix.exit > 0) {
    const preset = motion.exit;
    if (preset === "fade") {
      opacityKeyframes.push({t: exitStart, s: [baseOpacity], h: 0});
      opacityKeyframes.push({t: node.timing.from + node.timing.durationInFrames, s: [Math.round(baseOpacity * (1 - mix.exit))], h: 0});
    } else if (preset === "rise" || preset === "drop" || preset === "slide-left" || preset === "slide-right") {
      const direction = preset === "rise" ? 1 : preset === "drop" ? -1 : preset === "slide-left" ? -1 : 1;
      const axis = preset === "slide-left" || preset === "slide-right" ? 0 : 1;
      const start = axis === 0 ? positionX : positionY;
      const end = start + direction * 140 * mix.exit;
      positionKeyframes.push({t: exitStart, s: axis === 0 ? [start, positionY, 0] : [positionX, start, 0], h: 0});
      positionKeyframes.push({t: node.timing.from + node.timing.durationInFrames, s: axis === 0 ? [end, positionY, 0] : [positionX, end, 0], h: 0});
      opacityKeyframes.push({t: node.timing.from + node.timing.durationInFrames, s: [Math.round(baseOpacity * (1 - mix.exit * 0.5))], h: 0});
    }
  }

  return {
    o: opacityKeyframes.length > 0
      ? {a: 1, k: opacityKeyframes, ix: 11}
      : {a: 0, k: baseOpacity, ix: 11},
    r: {a: 0, k: baseRotation, ix: 10},
    p: positionKeyframes.length > 0
      ? {a: 1, k: positionKeyframes, ix: 2}
      : {a: 0, k: [positionX, positionY, 0], ix: 2},
    a: {a: 0, k: [anchorX, anchorY, 0], ix: 1},
    s: scaleKeyframes.length > 0
      ? {a: 1, k: scaleKeyframes, ix: 6}
      : {a: 0, k: [baseScale, baseScale, 100], ix: 6},
  };
};
