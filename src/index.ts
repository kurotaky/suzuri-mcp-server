import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createServer as createHttpServer } from "node:http";
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { suzuriRequest } from "./client.js";
import { PLACEMENT_PRESETS, getPresetsForCategory, resolvePlacementParams } from "./presets.js";
import { buildPreviewUrl } from "./preview.js";

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/webp";
    const mimeType = contentType.startsWith("image/") ? contentType.split(";")[0]! : "image/webp";
    const arrayBuffer = await res.arrayBuffer();
    const data = Buffer.from(arrayBuffer).toString("base64");
    return { data, mimeType };
  } catch {
    return null;
  }
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "suzuri-mcp-server",
    version: "0.1.0",
  });

  // --- Products ---

  server.tool(
    "search_products",
    "キーワードで商品を検索する",
    {
      query: z.string().describe("検索キーワード"),
      limit: z.number().optional().describe("取得件数（最大50）"),
      offset: z.number().optional().describe("オフセット"),
    },
    async ({ query, limit, offset }) => {
      const data = await suzuriRequest("/products/search", {
        params: { q: query, limit, offset },
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_product",
    "商品IDを指定して商品の詳細を取得する",
    { productId: z.number().describe("商品ID") },
    async ({ productId }) => {
      const data = await suzuriRequest(`/products/${productId}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "list_products",
    "商品一覧を取得する",
    {
      limit: z.number().optional().describe("取得件数（最大50）"),
      offset: z.number().optional().describe("オフセット"),
    },
    async ({ limit, offset }) => {
      const data = await suzuriRequest("/products", { params: { limit, offset } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "list_on_sale_products",
    "セール中の商品一覧を取得する",
    {
      limit: z.number().optional().describe("取得件数（最大50）"),
      offset: z.number().optional().describe("オフセット"),
    },
    async ({ limit, offset }) => {
      const data = await suzuriRequest("/products/on_sale", { params: { limit, offset } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Materials ---

  server.tool(
    "list_materials",
    "素材（デザイン画像）一覧を取得する",
    {
      limit: z.number().optional().describe("取得件数（最大50）"),
      offset: z.number().optional().describe("オフセット"),
    },
    async ({ limit, offset }) => {
      const data = await suzuriRequest("/materials", { params: { limit, offset } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_material",
    "画像URLから素材を作成する",
    {
      texture: z.string().describe("画像URL"),
      title: z.string().describe("素材のタイトル"),
      description: z.string().optional().describe("素材の説明"),
      price: z.number().optional().describe("トリブン（クリエイターの利益）"),
      products: z
        .array(
          z.object({
            itemId: z.number().describe("アイテムID"),
            published: z.boolean().describe("公開するか"),
            resizeMode: z.string().optional().describe("リサイズモード"),
          })
        )
        .optional()
        .describe("同時に作成する商品"),
    },
    async ({ texture, title, description, price, products }) => {
      const data = await suzuriRequest("/materials", {
        method: "POST",
        body: { texture, title, description, price, products },
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_text_material",
    "テキストから素材を作成する",
    {
      text: z.string().describe("テキスト内容"),
      title: z.string().describe("素材のタイトル"),
      description: z.string().optional().describe("素材の説明"),
      price: z.number().optional().describe("トリブン"),
    },
    async ({ text, title, description, price }) => {
      const data = await suzuriRequest("/materials/text", {
        method: "POST",
        body: { text, title, description, price },
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_material",
    "素材を更新する",
    {
      materialId: z.number().describe("素材ID"),
      title: z.string().optional().describe("タイトル"),
      description: z.string().optional().describe("説明"),
      price: z.number().optional().describe("トリブン"),
    },
    async ({ materialId, title, description, price }) => {
      const body: Record<string, unknown> = {};
      if (title !== undefined) body.title = title;
      if (description !== undefined) body.description = description;
      if (price !== undefined) body.price = price;
      const data = await suzuriRequest(`/materials/${materialId}`, {
        method: "PUT",
        body,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "delete_material",
    "素材を削除する",
    { materialId: z.number().describe("素材ID") },
    async ({ materialId }) => {
      const data = await suzuriRequest(`/materials/${materialId}`, { method: "DELETE" });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Items ---

  server.tool(
    "list_items",
    "利用可能なアイテム（Tシャツ、マグカップ等の商品種別）一覧を取得する",
    {},
    async () => {
      const data = await suzuriRequest("/items");
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Users ---

  server.tool(
    "get_current_user",
    "認証中のユーザー情報を取得する",
    {},
    async () => {
      const data = await suzuriRequest("/user");
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_user",
    "ユーザー情報を取得する",
    { userId: z.number().describe("ユーザーID") },
    async ({ userId }) => {
      const data = await suzuriRequest(`/users/${userId}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_user",
    "認証中のユーザープロフィールを更新する",
    {
      displayName: z.string().optional().describe("表示名"),
      biography: z.string().optional().describe("自己紹介"),
    },
    async ({ displayName, biography }) => {
      const body: Record<string, unknown> = {};
      if (displayName !== undefined) body.displayName = displayName;
      if (biography !== undefined) body.biography = biography;
      const data = await suzuriRequest("/user", { method: "PUT", body });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Favorites ---

  server.tool(
    "add_favorite",
    "商品をお気に入り（スキ！）に追加する",
    { productId: z.number().describe("商品ID") },
    async ({ productId }) => {
      const data = await suzuriRequest(`/products/${productId}/favorites`, { method: "POST" });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "remove_favorite",
    "商品のお気に入り（スキ！）を解除する",
    { productId: z.number().describe("商品ID") },
    async ({ productId }) => {
      const data = await suzuriRequest(`/products/${productId}/favorites`, { method: "DELETE" });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Activities ---

  server.tool(
    "list_activities",
    "アクティビティ（売上、お気に入り等のイベント）一覧を取得する",
    {
      limit: z.number().optional().describe("取得件数（最大50）"),
      offset: z.number().optional().describe("オフセット"),
    },
    async ({ limit, offset }) => {
      const data = await suzuriRequest("/activities", { params: { limit, offset } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_unread_activities_count",
    "未読アクティビティ数を取得する",
    {},
    async () => {
      const data = await suzuriRequest("/activities/unreads");
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Choices ---

  server.tool(
    "list_choices",
    "チョイス（キュレーションコレクション）一覧を取得する",
    {
      limit: z.number().optional().describe("取得件数（最大50）"),
      offset: z.number().optional().describe("オフセット"),
    },
    async ({ limit, offset }) => {
      const data = await suzuriRequest("/choices", { params: { limit, offset } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_choice",
    "チョイスを作成する",
    {
      name: z.string().describe("チョイス名"),
      description: z.string().optional().describe("説明"),
      productIds: z.array(z.number()).optional().describe("追加する商品IDの配列"),
    },
    async ({ name, description, productIds }) => {
      const data = await suzuriRequest("/choices", {
        method: "POST",
        body: { name, description, productIds },
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_choice",
    "チョイスを更新する",
    {
      choiceId: z.number().describe("チョイスID"),
      name: z.string().optional().describe("チョイス名"),
      description: z.string().optional().describe("説明"),
    },
    async ({ choiceId, name, description }) => {
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (description !== undefined) body.description = description;
      const data = await suzuriRequest(`/choices/${choiceId}`, { method: "PUT", body });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "delete_choice",
    "チョイスを削除する",
    { choiceId: z.number().describe("チョイスID") },
    async ({ choiceId }) => {
      const data = await suzuriRequest(`/choices/${choiceId}`, { method: "DELETE" });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- Placement ---

  server.tool(
    "get_placement_presets",
    "配置プリセット（黄金パターン）一覧を取得する。素材をアイテムに配置する際のおすすめパターンを提案するために使用。ユーザーにプリセットを提示し、好みの配置を選んでもらうフローの最初のステップ。",
    {
      category: z
        .enum(["all", "tshirt", "hoodie", "mug", "tote"])
        .optional()
        .describe("アイテムカテゴリでフィルタ。省略時は全プリセット返却"),
    },
    async ({ category }) => {
      const presets = getPresetsForCategory(category);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ presets }, null, 2) }],
      };
    }
  );

  server.tool(
    "preview_product_placement",
    "素材の配置をプレビューする。商品のsampleImageUrlにadjustmentパラメータを挿入して、配置を変更したプレビュー画像URLを生成する。API呼び出し不要で即座にURLを返す。ユーザーに画像を見せてフィードバックを受け、パラメータを微調整するループで使用。",
    {
      sampleImageUrl: z.string().describe("商品のsampleImageUrl（create_materialの応答から取得）"),
      scale: z.number().optional().describe("スケール (デフォルト: 1.0)。0.1〜3.0"),
      offsetX: z.number().optional().describe("X軸オフセット (デフォルト: 0.0)。-1.0〜1.0"),
      offsetY: z.number().optional().describe("Y軸オフセット (デフォルト: 0.0)。-1.0〜1.0"),
      presetName: z.string().optional().describe("プリセット名。指定するとscale/offsetをプリセット値で補完"),
    },
    async ({ sampleImageUrl, scale, offsetX, offsetY, presetName }) => {
      const params = resolvePlacementParams({ presetName, scale, offsetX, offsetY });
      const previewUrl = buildPreviewUrl(sampleImageUrl, params);
      const image = await fetchImageAsBase64(previewUrl);

      const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];
      if (image) {
        content.push({ type: "image" as const, data: image.data, mimeType: image.mimeType });
      }
      content.push({
        type: "text" as const,
        text: JSON.stringify({ previewUrl, appliedParams: params, presetUsed: presetName ?? null }, null, 2),
      });
      return { content };
    }
  );

  server.tool(
    "compare_placements",
    "複数の配置パターンをブラウザで比較する。HTMLを生成してブラウザを開き、ユーザーが好みの配置を選択できるUIを表示する。選択結果はget_browser_selectionで取得する。",
    {
      sampleImageUrl: z.string().describe("商品のsampleImageUrl（create_materialの応答から取得）"),
      productPageUrl: z.string().optional().describe("SUZURI商品ページURL（「SUZURIで開く」ボタン用）"),
      placements: z
        .array(
          z.object({
            label: z.string().optional().describe("この配置の名前（表示用）"),
            description: z.string().optional().describe("配置の説明"),
            scale: z.number().optional(),
            offsetX: z.number().optional(),
            offsetY: z.number().optional(),
            presetName: z.string().optional(),
          })
        )
        .min(1)
        .max(6)
        .describe("比較する配置のリスト（最大6つ）"),
    },
    async ({ sampleImageUrl, productPageUrl, placements }) => {
      const comparisons = placements.map((placement) => {
        const params = resolvePlacementParams({
          presetName: placement.presetName,
          scale: placement.scale,
          offsetX: placement.offsetX,
          offsetY: placement.offsetY,
        });
        const previewUrl = buildPreviewUrl(sampleImageUrl, params);
        return {
          label: placement.label ?? placement.presetName ?? "カスタム",
          description: placement.description ?? "",
          preset: placement.presetName ?? "",
          ...params,
          previewUrl,
        };
      });

      const tmpDir = "/tmp/suzuri-preview";
      mkdirSync(tmpDir, { recursive: true });
      const selectionFile = `${tmpDir}/selection.json`;
      if (existsSync(selectionFile)) unlinkSync(selectionFile);

      const html = generateCompareHtml(comparisons, productPageUrl);

      const port = await startSelectionServer(html, selectionFile);
      const url = `http://localhost:${port}`;
      try { execSync(`open "${url}"`); } catch { /* ignore */ }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            message: "ブラウザで比較ページを開きました。ユーザーが配置を選択したら get_browser_selection を呼んで結果を取得してください。",
            browserUrl: url,
            comparisons: comparisons.map(c => ({ label: c.label, scale: c.scale, offsetX: c.offsetX, offsetY: c.offsetY })),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_browser_selection",
    "ブラウザでの配置選択結果を取得する。compare_placementsでブラウザを開いた後、ユーザーが選択を完了するまで待機し、選択された配置パラメータを返す。",
    {},
    async () => {
      const selectionFile = "/tmp/suzuri-preview/selection.json";

      // 最大60秒待機
      for (let i = 0; i < 60; i++) {
        if (existsSync(selectionFile)) {
          const data = readFileSync(selectionFile, "utf-8");
          const selection = JSON.parse(data);
          unlinkSync(selectionFile);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(selection, null, 2),
            }],
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "タイムアウト: 60秒以内に選択されませんでした。" }),
        }],
      };
    }
  );

  server.tool(
    "analyze_reference_image",
    "参考画像を分析して配置パラメータを推定する。ユーザーが「この写真みたいに配置して」と参考画像を渡した際に使用。画像をAIに返し、素材の位置・サイズを分析してscale/offsetX/offsetYの推定値を導き出す。推定後はpreview_product_placementでプレビューし、微調整するフローに繋げる。",
    {
      referenceImageUrl: z.string().describe("参考画像のURL。配置を真似したい商品写真やデザイン例"),
      itemType: z
        .enum(["tshirt", "hoodie", "mug", "tote", "other"])
        .optional()
        .describe("対象アイテムの種類。分析精度が向上する"),
    },
    async ({ referenceImageUrl, itemType }) => {
      const res = await fetch(referenceImageUrl);
      if (!res.ok) {
        throw new Error(`画像の取得に失敗しました (${res.status}): ${referenceImageUrl}`);
      }

      const contentType = res.headers.get("content-type") ?? "image/png";
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const mimeType = contentType.startsWith("image/") ? contentType.split(";")[0]! : "image/png";

      const presetsInfo = PLACEMENT_PRESETS.map((p) => `${p.name}: scale=${p.scale}, offsetX=${p.offsetX}, offsetY=${p.offsetY} (${p.label})`).join("\n");

      const analysisPrompt = [
        "この参考画像を分析して、素材（デザイン/ロゴ/イラスト）がアイテム上のどの位置にどのサイズで配置されているか推定してください。",
        "",
        `対象アイテム: ${itemType ?? "不明"}`,
        "",
        "以下の配置パラメータを推定してください:",
        "- scale: 素材のサイズ倍率（0.1〜3.0。1.0が標準サイズ）",
        "- offsetX: 水平位置（-1.0=左端 〜 0.0=中央 〜 1.0=右端）",
        "- offsetY: 垂直位置（-1.0=上端 〜 0.0=中央 〜 1.0=下端）",
        "",
        "参考: 利用可能なプリセット一覧:",
        presetsInfo,
        "",
        "推定したパラメータは preview_product_placement ツールで実際にプレビューして確認してください。",
      ].join("\n");

      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType,
          },
          {
            type: "text" as const,
            text: analysisPrompt,
          },
        ],
      };
    }
  );

  server.tool(
    "create_product_with_placement",
    "配置パラメータを指定して商品を作成する。プレビューで確定した配置で実際に商品を作成・公開するための最終ステップ。",
    {
      materialId: z.number().describe("素材ID"),
      itemId: z.number().describe("アイテムID"),
      scale: z.number().optional().describe("スケール"),
      offsetX: z.number().optional().describe("X軸オフセット"),
      offsetY: z.number().optional().describe("Y軸オフセット"),
      presetName: z.string().optional().describe("プリセット名"),
      published: z.boolean().describe("公開するか"),
      color: z.string().optional().describe("商品カラー"),
    },
    async ({ materialId, itemId, scale, offsetX, offsetY, presetName, published, color }) => {
      const params = resolvePlacementParams({ presetName, scale, offsetX, offsetY });
      const data = await suzuriRequest(`/materials/${materialId}/products`, {
        method: "POST",
        body: {
          itemId,
          published,
          ...params,
          color,
        },
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  return server;
}

interface ComparisonItem {
  label: string;
  description: string;
  preset: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  previewUrl: string;
}

function generateCompareHtml(comparisons: ComparisonItem[], productPageUrl?: string): string {
  const placementsJson = JSON.stringify(comparisons);
  const suzuriUrl = productPageUrl ? `'${productPageUrl}'` : "null";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SUZURI 配置プレビュー比較</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f7;color:#1d1d1f;padding:32px}
h1{text-align:center;font-size:24px;font-weight:600;margin-bottom:8px}
.subtitle{text-align:center;color:#86868b;font-size:14px;margin-bottom:32px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;max-width:1200px;margin:0 auto}
.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:transform .2s,box-shadow .2s;cursor:pointer;position:relative}
.card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,.12)}
.card.selected{outline:3px solid #0071e3}
.card.selected::after{content:'✓ 選択中';position:absolute;top:12px;right:12px;background:#0071e3;color:#fff;font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px}
.card img{width:100%;aspect-ratio:1;object-fit:contain;background:#fafafa}
.card-body{padding:16px}
.card-title{font-size:16px;font-weight:600;margin-bottom:4px}
.card-desc{font-size:13px;color:#86868b;margin-bottom:8px;min-height:18px}
.params{display:flex;gap:8px;flex-wrap:wrap}
.param{font-size:11px;background:#f0f0f5;color:#555;padding:3px 8px;border-radius:6px;font-family:'SF Mono',monospace}
.actions{text-align:center;margin-top:32px}
.btn{display:inline-block;padding:12px 32px;border-radius:24px;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;border:none;transition:background .2s}
.btn-primary{background:#0071e3;color:#fff}
.btn-primary:hover{background:#0077ed}
.btn-primary:disabled{background:#ccc;cursor:not-allowed}
.btn-secondary{background:#e8e8ed;color:#1d1d1f;margin-left:12px}
.btn-secondary:hover{background:#ddd}
.result{text-align:center;margin-top:16px;font-size:14px;color:#86868b;min-height:24px}
.done{text-align:center;margin-top:48px;font-size:18px;color:#34c759;font-weight:600;display:none}
</style>
</head>
<body>
<h1>SUZURI 配置プレビュー比較</h1>
<p class="subtitle">好みの配置をクリックして「この配置で決定」を押してください</p>
<div class="grid" id="grid"></div>
<div class="actions">
  <button class="btn btn-primary" id="confirmBtn" disabled onclick="confirmSelection()">この配置で決定</button>
  ${productPageUrl ? `<button class="btn btn-secondary" onclick="window.open(${suzuriUrl},'_blank')">SUZURIで開く</button>` : ""}
</div>
<p class="result" id="result"></p>
<div class="done" id="done">✓ 選択を送信しました。ブラウザを閉じてClaude Codeに戻ってください。</div>
<script>
const placements=${placementsJson};
let selectedIndex=null;
const grid=document.getElementById('grid');
placements.forEach((p,i)=>{
  const card=document.createElement('div');
  card.className='card';
  card.onclick=()=>{
    document.querySelectorAll('.card').forEach(c=>c.classList.remove('selected'));
    card.classList.add('selected');
    selectedIndex=i;
    document.getElementById('confirmBtn').disabled=false;
    document.getElementById('result').textContent='「'+p.label+'」を選択中';
  };
  card.innerHTML='<img src="'+p.previewUrl+'" alt="'+p.label+'" loading="lazy"><div class="card-body"><div class="card-title">'+p.label+'</div><div class="card-desc">'+p.description+'</div><div class="params"><span class="param">scale: '+p.scale+'</span><span class="param">offsetX: '+p.offsetX+'</span><span class="param">offsetY: '+p.offsetY+'</span></div></div>';
  grid.appendChild(card);
});
function confirmSelection(){
  if(selectedIndex===null)return;
  const p=placements[selectedIndex];
  fetch('/select',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:p.label,preset:p.preset,scale:p.scale,offsetX:p.offsetX,offsetY:p.offsetY,previewUrl:p.previewUrl})}).then(()=>{
    document.getElementById('done').style.display='block';
    document.querySelector('.actions').style.display='none';
    document.getElementById('result').textContent='';
  });
}
</script>
</body>
</html>`;
}

function startSelectionServer(html: string, selectionFile: string): Promise<number> {
  return new Promise((resolve) => {
    const httpServer = createHttpServer((req, res) => {
      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
      } else if (req.method === "POST" && req.url === "/select") {
        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        req.on("end", () => {
          writeFileSync(selectionFile, body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end('{"ok":true}');
          setTimeout(() => httpServer.close(), 2000);
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve(port);
    });
  });
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("サーバー起動エラー:", error);
  process.exit(1);
});
