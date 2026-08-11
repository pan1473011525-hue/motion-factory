const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * 将组件默认矩形的中心对齐到画布拖放点，并保证矩形完整留在画布内。
 */
export const placeRectAtPoint = (
  point: {x: number; y: number},
  size: {width: number; height: number},
): {x: number; y: number} => ({
  x: clamp(point.x - size.width / 2, 0, Math.max(0, 1 - size.width)),
  y: clamp(point.y - size.height / 2, 0, Math.max(0, 1 - size.height)),
});
