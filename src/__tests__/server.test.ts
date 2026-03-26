import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../index.js';

// suzuriRequest をモック
vi.mock('../client.js', () => ({
  getToken: () => 'test-token',
  suzuriRequest: vi.fn(),
}));

import { suzuriRequest } from '../client.js';

const mockedRequest = vi.mocked(suzuriRequest);

describe('MCPサーバー', () => {
  let client: Client;

  beforeEach(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: 'test-client', version: '1.0.0' });

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('全ツールが登録されている', async () => {
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain('search_products');
    expect(toolNames).toContain('get_product');
    expect(toolNames).toContain('list_products');
    expect(toolNames).toContain('list_on_sale_products');
    expect(toolNames).toContain('list_materials');
    expect(toolNames).toContain('create_material');
    expect(toolNames).toContain('create_text_material');
    expect(toolNames).toContain('update_material');
    expect(toolNames).toContain('delete_material');
    expect(toolNames).toContain('list_items');
    expect(toolNames).toContain('get_current_user');
    expect(toolNames).toContain('get_user');
    expect(toolNames).toContain('update_user');
    expect(toolNames).toContain('add_favorite');
    expect(toolNames).toContain('remove_favorite');
    expect(toolNames).toContain('list_activities');
    expect(toolNames).toContain('get_unread_activities_count');
    expect(toolNames).toContain('list_choices');
    expect(toolNames).toContain('create_choice');
    expect(toolNames).toContain('update_choice');
    expect(toolNames).toContain('delete_choice');
    expect(toolNames).toContain('get_placement_presets');
    expect(toolNames).toContain('preview_product_placement');
    expect(toolNames).toContain('compare_placements');
    expect(toolNames).toContain('create_product_with_placement');
    expect(toolNames).toContain('analyze_reference_image');
    expect(toolNames).toContain('get_browser_selection');
    expect(tools).toHaveLength(27);
  });

  it('search_products がキーワードで検索できる', async () => {
    const mockData = { products: [{ id: 1, title: 'ねこTシャツ' }] };
    mockedRequest.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: 'search_products',
      arguments: { query: 'ねこ', limit: 10 },
    });

    expect(mockedRequest).toHaveBeenCalledWith('/products/search', {
      params: { q: 'ねこ', limit: 10, offset: undefined },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual(mockData);
  });

  it('get_product が商品詳細を取得できる', async () => {
    const mockData = { product: { id: 42, title: 'テスト商品' } };
    mockedRequest.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: 'get_product',
      arguments: { productId: 42 },
    });

    expect(mockedRequest).toHaveBeenCalledWith('/products/42');
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual(mockData);
  });

  it('create_material が素材を作成できる', async () => {
    const mockData = { material: { id: 1, title: '新素材' } };
    mockedRequest.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: 'create_material',
      arguments: {
        texture: 'https://example.com/image.png',
        title: '新素材',
        price: 500,
      },
    });

    expect(mockedRequest).toHaveBeenCalledWith('/materials', {
      method: 'POST',
      body: {
        texture: 'https://example.com/image.png',
        title: '新素材',
        description: undefined,
        price: 500,
        products: undefined,
      },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual(mockData);
  });

  it('delete_material が素材を削除できる', async () => {
    mockedRequest.mockResolvedValue({ success: true });

    const result = await client.callTool({
      name: 'delete_material',
      arguments: { materialId: 99 },
    });

    expect(mockedRequest).toHaveBeenCalledWith('/materials/99', { method: 'DELETE' });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual({ success: true });
  });

  it('get_current_user が認証ユーザー情報を取得できる', async () => {
    const mockData = { user: { id: 1, name: 'testuser' } };
    mockedRequest.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: 'get_current_user',
      arguments: {},
    });

    expect(mockedRequest).toHaveBeenCalledWith('/user');
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual(mockData);
  });

  it('get_placement_presets がプリセット一覧を返す', async () => {
    const result = await client.callTool({
      name: 'get_placement_presets',
      arguments: {},
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0]!.text);
    expect(data.presets.length).toBeGreaterThan(0);
    expect(data.presets[0]).toHaveProperty('name');
    expect(data.presets[0]).toHaveProperty('scale');
  });

  it('get_placement_presets がカテゴリでフィルタできる', async () => {
    const result = await client.callTool({
      name: 'get_placement_presets',
      arguments: { category: 'mug' },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0]!.text);
    for (const preset of data.presets) {
      expect(preset.recommendedFor).toContain('mug');
    }
  });

  it('preview_product_placement がプレビューURLを生成できる', async () => {
    const sampleUrl = 'https://lens.suzuri.jp/v3/500x500/t-shirt/s/white/front/123/100-1920x1080.jpg.webp?h=abc&printed=true';

    const result = await client.callTool({
      name: 'preview_product_placement',
      arguments: { sampleImageUrl: sampleUrl, scale: 0.5, offsetX: 0.1, offsetY: -0.1 },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0]!.text);
    expect(data.appliedParams).toEqual({ scale: 0.5, offsetX: 0.1, offsetY: -0.1 });
    expect(data.previewUrl).toContain('.0.5+0.1-0.1.');
  });

  it('preview_product_placement がプリセット名でプレビューできる', async () => {
    const sampleUrl = 'https://lens.suzuri.jp/v3/500x500/t-shirt/s/white/front/123/100-1920x1080.jpg.webp?h=abc&printed=true';

    const result = await client.callTool({
      name: 'preview_product_placement',
      arguments: { sampleImageUrl: sampleUrl, presetName: 'left_chest' },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0]!.text);
    expect(data.appliedParams).toEqual({ scale: 0.3, offsetX: -0.25, offsetY: -0.2 });
    expect(data.presetUsed).toBe('left_chest');
    expect(data.previewUrl).toContain('.0.3-0.25-0.2.');
  });

  it('compare_placements がブラウザ比較ページを生成できる', async () => {
    const sampleUrl = 'https://lens.suzuri.jp/v3/500x500/t-shirt/s/white/front/123/100-1920x1080.jpg.webp?h=abc&printed=true';

    // execSyncをモック（open コマンド）
    vi.mock('node:child_process', () => ({ execSync: vi.fn() }));

    const result = await client.callTool({
      name: 'compare_placements',
      arguments: {
        sampleImageUrl: sampleUrl,
        placements: [
          { label: '中央', presetName: 'center' },
          { label: '左胸', presetName: 'left_chest' },
        ],
      },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0]!.text);
    expect(data.browserUrl).toMatch(/^http:\/\/localhost:\d+$/);
    expect(data.comparisons).toHaveLength(2);
    expect(data.comparisons[0].label).toBe('中央');
    expect(data.comparisons[1].label).toBe('左胸');
  });

  it('create_product_with_placement が配置指定で商品を作成できる', async () => {
    const mockData = { product: { id: 42 } };
    mockedRequest.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: 'create_product_with_placement',
      arguments: {
        materialId: 100,
        itemId: 1,
        presetName: 'left_chest',
        published: true,
      },
    });

    expect(mockedRequest).toHaveBeenCalledWith('/materials/100/products', {
      method: 'POST',
      body: { itemId: 1, published: true, scale: 0.3, offsetX: -0.25, offsetY: -0.2, color: undefined },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual(mockData);
  });

  it('analyze_reference_image が参考画像を分析用に返す', async () => {
    // fetchをモック
    const originalFetch = globalThis.fetch;
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'image/png' }),
      arrayBuffer: () => Promise.resolve(pngBytes.buffer),
    }) as unknown as typeof fetch;

    try {
      const result = await client.callTool({
        name: 'analyze_reference_image',
        arguments: { referenceImageUrl: 'https://example.com/ref.png', itemType: 'tshirt' },
      });

      const content = result.content as Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
      expect(content).toHaveLength(2);
      expect(content[0]!.type).toBe('image');
      expect(content[0]!.mimeType).toBe('image/png');
      expect(content[0]!.data).toBeDefined();
      expect(content[1]!.type).toBe('text');
      expect(content[1]!.text).toContain('参考画像を分析');
      expect(content[1]!.text).toContain('tshirt');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('add_favorite がお気に入りを追加できる', async () => {
    const mockData = { favorite: { id: 1 } };
    mockedRequest.mockResolvedValue(mockData);

    const result = await client.callTool({
      name: 'add_favorite',
      arguments: { productId: 10 },
    });

    expect(mockedRequest).toHaveBeenCalledWith('/products/10/favorites', { method: 'POST' });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual(mockData);
  });
});
