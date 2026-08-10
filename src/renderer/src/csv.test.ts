import {describe, expect, it} from "vitest";
import {parseCsv} from "./csv";

describe("parseCsv", () => {
  it("parses Numbers-compatible rows and quoted commas", () => {
    expect(parseCsv("名称,value,source\n甲,12.5,统计局\n乙,9,\"报告, 第2页\"\n")).toEqual([
      {名称: "甲", value: "12.5", source: "统计局"},
      {名称: "乙", value: "9", source: "报告, 第2页"},
    ]);
  });

  it("rejects malformed headers", () => {
    expect(() => parseCsv("name,name\na,b")).toThrow("不能重复");
  });
});
