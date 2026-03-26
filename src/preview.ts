import { createHash } from "node:crypto";

/**
 * 数値をSUZURI lens互換のフォーマットに変換する
 * ルール: %.5fで整形 → 末尾の0を削除 → 小数部が空なら0をつける
 * 例: 0.0 → "0.0", 0.5 → "0.5", 1.0 → "1.0", 0.7222 → "0.7222"
 */
export function formatLensNumber(n: number): string {
  const fixed = n.toFixed(5);
  const [intPart, decPart] = fixed.split(".");
  const trimmed = decPart!.replace(/0+$/, "") || "0";
  return `${intPart}.${trimmed}`;
}

/**
 * プレビューURL内のadjustment文字列を生成する
 * 形式: {scale}{signedOffsetX}{signedOffsetY}
 * 例: "0.5+0.0+0.0", "0.3-0.25+0.2"
 */
export function formatAdjustment(scale: number, offsetX: number, offsetY: number): string {
  const fmt = formatLensNumber;
  const signedValue = (n: number) => (n >= 0 ? `+${fmt(n)}` : fmt(n));
  return `${fmt(scale)}${signedValue(offsetX)}${signedValue(offsetY)}`;
}

/**
 * ベースハッシュとadjustmentからadjustment付きハッシュを計算する
 * hash = SHA1("${baseHash} ${adjustment}")
 */
export function computeAdjustedHash(baseHash: string, adjustment: string): string {
  return createHash("sha1").update(`${baseHash} ${adjustment}`).digest("hex");
}

/**
 * sampleImageUrlからベースハッシュを抽出する
 */
export function extractBaseHash(sampleImageUrl: string): string | null {
  const match = sampleImageUrl.match(/[?&]h=([a-f0-9]+)/);
  return match ? match[1]! : null;
}

/**
 * sampleImageUrlにadjustmentパラメータとハッシュを挿入してプレビューURLを生成する
 *
 * 入力例:
 *   https://lens.suzuri.jp/.../19629714/1774438366-1920x1080.jpg.webp?h=abc123&printed=true
 * 出力例:
 *   https://lens.suzuri.jp/.../19629714/1774438366-1920x1080.jpg.0.5+0.0+0.0.webp?h=newHash&printed=true
 */
export function buildPreviewUrl(
  sampleImageUrl: string,
  params: { scale: number; offsetX: number; offsetY: number },
): string {
  const adjustment = formatAdjustment(params.scale, params.offsetX, params.offsetY);
  const baseHash = extractBaseHash(sampleImageUrl);

  // URLを?で分割してクエリパラメータを保持
  const [pathPart, queryPart] = sampleImageUrl.split("?");
  if (!pathPart) return sampleImageUrl;

  // パスにadjustmentを挿入
  const adjusted = pathPart.replace(
    /(\.(jpg|png))(\.[\d.+-]+)?(\.(webp|png))$/,
    `$1.${adjustment}$4`,
  );

  // ハッシュを再計算
  let newQuery = queryPart ?? "";
  if (baseHash) {
    const adjustedHash = computeAdjustedHash(baseHash, adjustment);
    newQuery = newQuery.replace(/h=[a-f0-9]+/, `h=${adjustedHash}`);
  }

  return newQuery ? `${adjusted}?${newQuery}` : adjusted;
}
