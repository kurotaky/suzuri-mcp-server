import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getToken, suzuriRequest } from "../client.js";

describe("getToken", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("SUZURI_TOKEN が設定されている場合はトークンを返す", () => {
    process.env.SUZURI_TOKEN = "test-token-123";
    expect(getToken()).toBe("test-token-123");
  });

  it("SUZURI_TOKEN が未設定の場合はエラーを投げる", () => {
    delete process.env.SUZURI_TOKEN;
    expect(() => getToken()).toThrow("SUZURI_TOKEN 環境変数が設定されていません");
  });
});

describe("suzuriRequest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SUZURI_TOKEN: "test-token" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("GETリクエストを正しく送信する", async () => {
    const mockResponse = { products: [{ id: 1, name: "テスト商品" }] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await suzuriRequest("/products");

    expect(fetch).toHaveBeenCalledWith(
      "https://suzuri.jp/api/v1/products",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("クエリパラメータを正しく付与する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await suzuriRequest("/products/search", {
      params: { q: "ねこ", limit: 10, offset: 0 },
    });

    const calledUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(calledUrl).toContain("q=%E3%81%AD%E3%81%93");
    expect(calledUrl).toContain("limit=10");
    expect(calledUrl).toContain("offset=0");
  });

  it("undefinedのパラメータは除外する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await suzuriRequest("/products", {
      params: { limit: 10, offset: undefined },
    });

    const calledUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(calledUrl).toContain("limit=10");
    expect(calledUrl).not.toContain("offset");
  });

  it("POSTリクエストでボディを送信する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    );

    await suzuriRequest("/materials", {
      method: "POST",
      body: { title: "テスト素材", texture: "https://example.com/image.png" },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://suzuri.jp/api/v1/materials",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "テスト素材", texture: "https://example.com/image.png" }),
      }),
    );
  });

  it("204レスポンスの場合は { success: true } を返す", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    const result = await suzuriRequest("/materials/1", { method: "DELETE" });
    expect(result).toEqual({ success: true });
  });

  it("エラーレスポンスの場合は例外を投げる", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    await expect(suzuriRequest("/products")).rejects.toThrow(
      "SUZURI API エラー (401): Unauthorized",
    );
  });
});
