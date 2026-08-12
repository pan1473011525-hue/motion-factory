import {describe, expect, it} from "vitest";
import {
  formatTimecode,
  framesToSeconds,
  createMotionProject,
  getDurationSeconds,
  parseMotionProjectJson,
  serializeMotionProject,
  secondsToFrames,
} from "./index";

const createFixture = () =>
  createMotionProject({
    id: "3ce0f817-8aa1-4c1e-9016-e814d09b34df",
    now: "2026-08-09T12:00:00.000Z",
    templateId: "stat-counter",
    templateVersion: "1.0.0",
    props: {title: "项目增长", value: 128.6},
  });

describe("motion project model", () => {
  it("round-trips a readable project file", () => {
    const project = createFixture();
    expect(parseMotionProjectJson(serializeMotionProject(project))).toEqual(project);
  });

  it("uses rational frame rates for duration calculations", () => {
    const project = createFixture();
    project.canvas.fps = {numerator: 30_000, denominator: 1_001};
    project.canvas.durationInFrames = 300;
    expect(getDurationSeconds(project)).toBeCloseTo(10.01, 6);
  });

  it("rejects odd canvas dimensions", () => {
    const json = JSON.parse(serializeMotionProject(createFixture())) as Record<
      string,
      unknown
    >;
    json.canvas = {...(json.canvas as object), width: 1921};
    expect(() => parseMotionProjectJson(JSON.stringify(json))).toThrow(
      "画布宽度必须为偶数",
    );
  });

  it("adds default animation controls to legacy project JSON", () => {
    const json = JSON.parse(serializeMotionProject(createFixture())) as Record<string, unknown>;
    delete json.animation;
    expect(parseMotionProjectJson(JSON.stringify(json)).animation).toEqual({
      speed: 1,
      reducedMotion: false,
      edgeFrames: 18,
    });
  });

  it("adds typography and safe output defaults to legacy project JSON", () => {
    const json = JSON.parse(serializeMotionProject(createFixture())) as Record<string, unknown>;
    delete json.typography;
    delete json.exportOptions;
    const parsed = parseMotionProjectJson(JSON.stringify(json));
    expect(parsed.typography).toEqual({fontAssetId: "", fallbackFamily: "system"});
    expect(parsed.exportOptions).toEqual({conflictPolicy: "version", segmented: false});
  });

  it("adds the segmented export default to existing v2 projects", () => {
    const json = JSON.parse(serializeMotionProject(createFixture())) as Record<string, unknown>;
    json.exportOptions = {conflictPolicy: "replace"};
    expect(parseMotionProjectJson(JSON.stringify(json)).exportOptions).toEqual({
      conflictPolicy: "replace",
      segmented: false,
    });
  });

  it("adds a backwards-compatible original template appearance", () => {
    const json = JSON.parse(serializeMotionProject(createFixture())) as Record<string, unknown>;
    delete json.templateAppearance;
    expect(parseMotionProjectJson(JSON.stringify(json)).templateAppearance).toEqual({
      surfaceColor: null,
      surfaceOpacity: 1,
      surfaceTone: "auto",
    });
  });

  it("adds backwards-compatible easing presets to existing composer nodes", () => {
    const json = JSON.parse(serializeMotionProject(createFixture())) as Record<string, unknown>;
    json.editorMode = "composer";
    json.composition = {
      backgroundColor: "transparent",
      snapToGrid: true,
      gridSize: 0.025,
      nodes: [{
        id: "legacy-node",
        name: "旧弹出图层",
        componentId: "rectangle",
        transform: {x: 0.1, y: 0.1, width: 0.4, height: 0.3, rotation: 0, anchorX: 0.5, anchorY: 0.5, opacity: 1, zIndex: 0},
        timing: {from: 0, durationInFrames: 90},
        motion: {enter: "pop", enterDuration: 15, exit: "fade", exitDuration: 15, loop: "none", intensity: 1, mix: {enter: 1, exit: 1, loop: 1}},
        props: {fill: "#242B35", borderColor: "#667181", borderWidth: 0, radius: 24},
        hidden: false,
        locked: false,
      }],
    };
    const motion = parseMotionProjectJson(JSON.stringify(json)).composition.nodes[0].motion;
    expect(motion.enterEasing).toBe("spring-snappy");
    expect(motion.contentEasing).toBe("expo-out");
    expect(motion.exitEasing).toBe("expo-out");
  });

  it("persists a semi-transparent custom template surface", () => {
    const project = createFixture();
    project.templateAppearance = {surfaceColor: "#F2F3F5", surfaceOpacity: 0.5, surfaceTone: "auto"};
    expect(parseMotionProjectJson(serializeMotionProject(project)).templateAppearance).toEqual(project.templateAppearance);
  });

  it("migrates v1 projects into compatible template mode", () => {
    const json = JSON.parse(serializeMotionProject(createFixture())) as Record<string, unknown>;
    json.formatVersion = 1;
    delete json.editorMode;
    delete json.composition;
    const parsed = parseMotionProjectJson(JSON.stringify(json));
    expect(parsed.formatVersion).toBe(2);
    expect(parsed.editorMode).toBe("template");
    expect(parsed.composition.nodes).toEqual([]);
  });
});

describe("frame conversion", () => {
  it("rounds fractional frame rates to an integer frame count", () => {
    const fps = {numerator: 30_000, denominator: 1_001};
    expect(secondsToFrames(5, fps)).toBe(150);
    expect(framesToSeconds(150, fps)).toBeCloseTo(5.005, 3);
    expect(formatTimecode(150, fps)).toBe("00:00:05:00");
  });
});
