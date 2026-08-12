import {describe, expect, it} from "vitest";
import {buildLottieExport} from "./lottie-export";

const makeNode = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  id: "node-1",
  name: "测试图层",
  componentId: "rectangle",
  transform: {x: 0.1, y: 0.2, width: 0.4, height: 0.3, rotation: 0, anchorX: 0.5, anchorY: 0.5, opacity: 1, zIndex: 0},
  timing: {from: 10, durationInFrames: 60},
  motion: {enter: "fade", enterDuration: 15, enterEasing: "linear", contentEasing: "linear", exit: "none", exitDuration: 15, exitEasing: "linear", loop: "none", intensity: 1, mix: {enter: 1, exit: 1, loop: 1}},
  props: {},
  hidden: false,
  locked: false,
  ...overrides,
});

const makeComposition = (nodes: Array<Record<string, unknown>>): Record<string, unknown> => ({
  backgroundColor: "transparent",
  snapToGrid: true,
  gridSize: 0.025,
  nodes,
});

describe("lottie export", () => {
  it("emits a valid lottie document with canvas and duration", () => {
    const {json, warnings} = buildLottieExport(
      makeComposition([makeNode({})]) as never,
      {width: 1920, height: 1080, fps: {numerator: 30, denominator: 1}},
      150,
    );
    expect(warnings).toEqual([]);
    expect(json.v).toBe("5.7.4");
    expect(json.fr).toBe(30);
    expect(json.w).toBe(1920);
    expect(json.h).toBe(1080);
    expect(json.ip).toBe(0);
    expect(json.op).toBe(150);
    expect(Array.isArray(json.layers)).toBe(true);
    expect((json.layers as unknown[]).length).toBe(1);
  });

  it("maps a rect node to a shape layer with timing", () => {
    const {json} = buildLottieExport(
      makeComposition([makeNode({})]) as never,
      {width: 1920, height: 1080, fps: {numerator: 30, denominator: 1}},
      150,
    );
    const layer = (json.layers as Array<Record<string, unknown>>)[0];
    expect(layer.ty).toBe(4);
    expect(layer.ip).toBe(10);
    expect(layer.op).toBe(70);
    expect(layer.nm).toBe("测试图层");
  });

  it("maps a text node to a text layer", () => {
    const node = makeNode({componentId: "body-text", props: {title: "你好", textColor: "#47A7FF"}});
    const {json} = buildLottieExport(
      makeComposition([node]) as never,
      {width: 1920, height: 1080, fps: {numerator: 30, denominator: 1}},
      150,
    );
    const layer = (json.layers as Array<Record<string, unknown>>)[0];
    expect(layer.ty).toBe(5);
    const textLayer = layer.t as {d: {k: Array<{s: Record<string, unknown>}>}};
    expect(textLayer.d.k[0].s.t).toBe("你好");
    expect(textLayer.d.k[0].s.fc).toEqual([0.2784313725490196, 0.6549019607843137, 1]);
  });

  it("emits opacity keyframes for fade enter", () => {
    const {json} = buildLottieExport(
      makeComposition([makeNode({})]) as never,
      {width: 1920, height: 1080, fps: {numerator: 30, denominator: 1}},
      150,
    );
    const layer = (json.layers as Array<Record<string, unknown>>)[0];
    const opacity = layer.ks as Record<string, {a: number; k: unknown[]}>;
    expect(opacity.o.a).toBe(1);
    expect(opacity.o.k).toHaveLength(1);
  });

  it("warns when Lottie falls back from a non-linear easing curve", () => {
    const node = makeNode({
      motion: {...(makeNode({}).motion as Record<string, unknown>), enterEasing: "spring-smooth"},
    });
    const {warnings} = buildLottieExport(
      makeComposition([node]) as never,
      {width: 1920, height: 1080, fps: {numerator: 30, denominator: 1}},
      150,
    );
    expect(warnings.some((warning) => warning.includes("Lottie") && warning.includes("线性插值"))).toBe(true);
  });

  it("skips unsupported layers with a warning", () => {
    const video = makeNode({componentId: "video", props: {assetId: "x"}});
    const {json, warnings} = buildLottieExport(
      makeComposition([video]) as never,
      {width: 1920, height: 1080, fps: {numerator: 30, denominator: 1}},
      150,
    );
    expect((json.layers as unknown[]).length).toBe(0);
    expect(warnings.some((warning) => warning.includes("video"))).toBe(true);
  });

  it("orders layers by z-index with higher z on top", () => {
    const low = makeNode({id: "low", name: "低", transform: {...(makeNode({}).transform as Record<string, unknown>), zIndex: 0}});
    const high = makeNode({id: "high", name: "高", transform: {...(makeNode({}).transform as Record<string, unknown>), zIndex: 5}});
    const {json} = buildLottieExport(
      makeComposition([high, low]) as never,
      {width: 1920, height: 1080, fps: {numerator: 30, denominator: 1}},
      150,
    );
    const names = (json.layers as Array<{nm: string}>).map((layer) => layer.nm);
    expect(names).toEqual(["低", "高"]);
  });
});
