import { cn } from "../src/lib/utils";

describe("cn ユーティリティ", () => {
  it("クラス名を結合できる", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });
});
