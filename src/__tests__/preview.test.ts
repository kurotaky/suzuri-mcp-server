import { describe, it, expect } from "vitest";
import { formatLensNumber, formatAdjustment, computeAdjustedHash, extractBaseHash, buildPreviewUrl } from "../preview.js";

describe("formatLensNumber", () => {
  it("0.0をそのまま保持する", () => {
    expect(formatLensNumber(0.0)).toBe("0.0");
  });

  it("0.5をそのまま保持する", () => {
    expect(formatLensNumber(0.5)).toBe("0.5");
  });

  it("1.0をそのまま保持する", () => {
    expect(formatLensNumber(1.0)).toBe("1.0");
  });

  it("小数点以下を適切にトリムする", () => {
    expect(formatLensNumber(0.7222)).toBe("0.7222");
    expect(formatLensNumber(0.25)).toBe("0.25");
    expect(formatLensNumber(1.3785)).toBe("1.3785");
  });

  it("負の値も正しくフォーマットする", () => {
    expect(formatLensNumber(-0.25)).toBe("-0.25");
    expect(formatLensNumber(-0.0047)).toBe("-0.0047");
  });
});

describe("formatAdjustment", () => {
  it("正の値でadjustment文字列を生成する", () => {
    expect(formatAdjustment(2.0, 0.0, 0.0)).toBe("2.0+0.0+0.0");
  });

  it("負のoffsetを含むadjustment文字列を生成する", () => {
    expect(formatAdjustment(0.3, -0.25, -0.2)).toBe("0.3-0.25-0.2");
  });

  it("実際のSUZURIデータと一致する", () => {
    expect(formatAdjustment(0.7222, 0.0, 0.0)).toBe("0.7222+0.0+0.0");
    expect(formatAdjustment(1.3785, -0.0047, 0.0287)).toBe("1.3785-0.0047+0.0287");
  });
});

describe("computeAdjustedHash", () => {
  it("ベースハッシュとadjustmentからSHA1ハッシュを計算する", () => {
    const baseHash = "69f3b42b25093ffe2e5aa151c8fb4a4546b7a628";
    const adjustment = "0.5+0.0+0.0";
    const result = computeAdjustedHash(baseHash, adjustment);
    expect(result).toBe("eae4fcedff3e2d59ff2d69421ccd39de0bea912d");
  });
});

describe("extractBaseHash", () => {
  it("URLからハッシュを抽出する", () => {
    const url = "https://lens.suzuri.jp/v3/500x500/t-shirt/s/white/front/123/100.jpg.webp?h=abc123def&printed=true";
    expect(extractBaseHash(url)).toBe("abc123def");
  });

  it("ハッシュがないURLではnullを返す", () => {
    expect(extractBaseHash("https://example.com/image.webp")).toBeNull();
  });
});

describe("buildPreviewUrl", () => {
  const baseUrl =
    "https://lens.suzuri.jp/v3/500x500/t-shirt/s/white/front/19629714/1774438366-1920x1080.jpg.webp?h=69f3b42b25093ffe2e5aa151c8fb4a4546b7a628&printed=true";

  it("adjustmentとハッシュを正しく挿入する", () => {
    const result = buildPreviewUrl(baseUrl, { scale: 0.5, offsetX: 0.0, offsetY: 0.0 });
    expect(result).toContain(".jpg.0.5+0.0+0.0.webp");
    expect(result).toContain("h=eae4fcedff3e2d59ff2d69421ccd39de0bea912d");
    expect(result).not.toContain("h=69f3b42b25093ffe2e5aa151c8fb4a4546b7a628");
  });

  it("負のオフセットを含むURLを生成する", () => {
    const result = buildPreviewUrl(baseUrl, { scale: 0.3, offsetX: -0.25, offsetY: -0.2 });
    expect(result).toContain(".jpg.0.3-0.25-0.2.webp");
    expect(result).not.toContain("h=69f3b42b25093ffe2e5aa151c8fb4a4546b7a628");
  });

  it("既存のadjustmentを置き換える", () => {
    const urlWithAdjustment =
      "https://lens.suzuri.jp/v3/500x500/t-shirt/s/white/front/19629714/1774438366-1920x1080.jpg.1.0+0.0+0.0.webp?h=oldhash&printed=true";
    const result = buildPreviewUrl(urlWithAdjustment, { scale: 0.5, offsetX: 0.0, offsetY: 0.0 });
    expect(result).toContain(".jpg.0.5+0.0+0.0.webp");
  });
});
