import {describe, expect, it} from "vitest";
import {safeFileStem} from "./file-names";

describe("cross-platform file names", () => {
  it("removes Windows-invalid characters and trailing dots", () => {
    expect(safeFileStem("  项目：A/B*?.  ")).toBe("项目：A-B-");
  });

  it("protects Windows device names", () => {
    expect(safeFileStem("CON")).toBe("_CON");
    expect(safeFileStem("lpt9.output")).toBe("_lpt9.output");
  });

  it("uses a fallback for an empty stem and trims after truncation", () => {
    expect(safeFileStem("...", "fallback")).toBe("fallback");
    expect(safeFileStem("1234. more", "fallback", 5)).toBe("1234");
  });
});
