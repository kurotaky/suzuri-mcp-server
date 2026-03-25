#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = "https://suzuri.jp/api/v1";

function getToken(): string {
  const token = process.env.SUZURI_TOKEN;
  if (!token) {
    throw new Error(
      "SUZURI_TOKEN 環境変数が設定されていません。https://suzuri.jp/developer/apps からトークンを取得してください。"
    );
  }
  return token;
}

async function suzuriRequest(
  path: string,
  options: {
    method?: string;
    params?: Record<string, string | number | undefined>;
    body?: Record<string, unknown>;
  } = {}
): Promise<unknown> {
  const { method = "GET", params, body } = options;
  const url = new URL(`${BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`SUZURI API エラー (${res.status}): ${errorText}`);
  }

  if (res.status === 204) return { success: true };
  return res.json();
}

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

// --- サーバー起動 ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("サーバー起動エラー:", error);
  process.exit(1);
});
