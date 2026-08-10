import {describe, expect, it} from "vitest";
import {matchAssetsByName} from "./asset-relink";

describe("asset relinking", () => {
  it("matches moved assets by normalized basename", () => {
    const assets = [{id: "a", path: "/old/主图.PNG", kind: "image" as const}];
    expect(matchAssetsByName(assets, ["/new/主图.png"]).get("a")).toBe("/new/主图.png");
  });

  it("uses a single explicit replacement even when the name changes", () => {
    const assets = [{id: "a", path: "/old/original.mov", kind: "video" as const}];
    expect(matchAssetsByName(assets, ["/new/replacement.mov"]).get("a")).toBe("/new/replacement.mov");
  });
});
