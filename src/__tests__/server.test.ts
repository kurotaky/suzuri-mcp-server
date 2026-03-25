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
    expect(tools).toHaveLength(21);
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
