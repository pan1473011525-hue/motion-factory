import {describe, expect, it} from "vitest";
import {computeMasonryLayout, computeRowsLayout} from "react-photo-album";

const photos = Array.from({length: 9}, (_, i) => ({
  src: `photo-${i}`,
  width: 1000 + (i % 3) * 300,
  height: 800 + (i % 4) * 200,
}));

// react-photo-album 的 compute*Layout 是位置参数：
// computeRowsLayout(photos, spacing, padding, containerWidth, targetRowHeight)
// computeMasonryLayout(photos, spacing, padding, containerWidth, columns)
describe("react-photo-album 布局纯函数（Remotion 可用性 PoC）", () => {
  it("computeRowsLayout 返回等宽行布局", () => {
    const model = computeRowsLayout(photos, 12, 0, 1080, 300)!;
    expect(model.tracks.length).toBeGreaterThan(0);
    const first = model.tracks[0].photos[0];
    expect(first).toMatchObject({width: expect.any(Number), height: expect.any(Number)});
    const rowWidth = model.tracks[0].photos.reduce((sum, p) => sum + p.width + model.spacing, 0);
    expect(Math.abs(rowWidth - 1080)).toBeLessThan(20);
    const total = model.tracks.reduce((sum, t) => sum + t.photos.length, 0);
    expect(total).toBe(9);
  });

  it("computeMasonryLayout 返回瀑布流布局", () => {
    const model = computeMasonryLayout(photos, 12, 0, 1080, 3)!;
    expect(model.variables?.columns).toBe(3);
    expect(model.tracks.length).toBe(3);
    const total = model.tracks.reduce((sum, t) => sum + t.photos.length, 0);
    expect(total).toBe(9);
  });
});
