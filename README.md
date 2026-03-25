# suzuri-mcp-server

[SUZURI](https://suzuri.jp/) API 用の MCP (Model Context Protocol) サーバーです。

Claude Desktop などの MCP クライアントから SUZURI の商品検索、素材管理、ユーザー情報取得などの操作ができます。

## セットアップ

### 1. APIトークンの取得

https://suzuri.jp/developer/apps からアクセストークンを取得してください。

### 2. ビルド

```bash
npm install
npm run build
```

### 3. Claude Desktop の設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加:

```json
{
  "mcpServers": {
    "suzuri": {
      "command": "node",
      "args": ["/path/to/suzuri-mcp-server/dist/index.js"],
      "env": {
        "SUZURI_TOKEN": "your-token-here"
      }
    }
  }
}
```

## 利用可能なツール

### Products（商品）

| ツール | 説明 |
|--------|------|
| `search_products` | キーワードで商品を検索 |
| `get_product` | 商品IDから詳細を取得 |
| `list_products` | 商品一覧を取得 |
| `list_on_sale_products` | セール中の商品一覧を取得 |

### Materials（素材）

| ツール | 説明 |
|--------|------|
| `list_materials` | 素材一覧を取得 |
| `create_material` | 画像URLから素材を作成 |
| `create_text_material` | テキストから素材を作成 |
| `update_material` | 素材を更新 |
| `delete_material` | 素材を削除 |

### Items（アイテム）

| ツール | 説明 |
|--------|------|
| `list_items` | アイテム種別（Tシャツ、マグカップ等）一覧を取得 |

### Users（ユーザー）

| ツール | 説明 |
|--------|------|
| `get_current_user` | 認証中のユーザー情報を取得 |
| `get_user` | ユーザーIDからユーザー情報を取得 |
| `update_user` | プロフィールを更新 |

### Favorites（スキ！）

| ツール | 説明 |
|--------|------|
| `add_favorite` | 商品をお気に入りに追加 |
| `remove_favorite` | お気に入りを解除 |

### Activities（アクティビティ）

| ツール | 説明 |
|--------|------|
| `list_activities` | アクティビティ一覧を取得 |
| `get_unread_activities_count` | 未読アクティビティ数を取得 |

### Choices（チョイス）

| ツール | 説明 |
|--------|------|
| `list_choices` | チョイス一覧を取得 |
| `create_choice` | チョイスを作成 |
| `update_choice` | チョイスを更新 |
| `delete_choice` | チョイスを削除 |

## 開発

```bash
npm run dev  # TypeScript のウォッチモード
```

## ライセンス

MIT
