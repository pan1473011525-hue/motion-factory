import {join} from "node:path";
import {describe, expect, it} from "vitest";
import {fingerprintFile} from "./asset-fingerprint";

describe("asset fingerprint", () => {
  it("creates a stable SHA-256 identity for collected media", async () => {
    const path = join(process.cwd(), "scripts", "fixtures", "media-sample.svg");
    const first = await fingerprintFile(path);
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(await fingerprintFile(path)).toBe(first);
  });
});
