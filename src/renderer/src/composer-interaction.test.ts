import {describe, expect, it} from "vitest";
import {placeRectAtPoint} from "./composer-interaction";

describe("composer component placement", () => {
  it("centers a component on the drop point", () => {
    expect(placeRectAtPoint({x: 0.5, y: 0.5}, {width: 0.2, height: 0.4})).toEqual({x: 0.4, y: 0.3});
  });

  it("keeps components inside every canvas edge", () => {
    expect(placeRectAtPoint({x: 0, y: 0}, {width: 0.2, height: 0.4})).toEqual({x: 0, y: 0});
    expect(placeRectAtPoint({x: 1, y: 1}, {width: 0.2, height: 0.4})).toEqual({x: 0.8, y: 0.6});
  });
});
