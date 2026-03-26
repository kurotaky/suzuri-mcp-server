# @kurotaky/suzuri-mcp-server

> **⚠️ Unofficial / 非公式**
> このMCPサーバーはSUZURIの公式プロダクトではありません。個人が開発・公開しているものです。

[SUZURI](https://suzuri.jp/) API 用の MCP (Model Context Protocol) サーバーです。

Claude Desktop などの MCP クライアントから SUZURI の商品検索、素材管理、配置プレビュー、ユーザー情報取得などの操作ができます。

## npx でセットアップ（推奨）

事前に https://suzuri.jp/developer/apps でAPIトークンを取得しておいてください。

```bash
claude mcp add suzuri -e SUZURI_TOKEN=your-token-here -- npx -y @kurotaky/suzuri-mcp-server
```

これだけで使えます。Claude Code を再起動すれば利用可能です。

## ソースからセットアップ

```bash
git clone https://github.com/kurotaky/suzuri-mcp-server.git
cd suzuri-mcp-server
./setup.sh
```

セットアップスクリプトが以下を自動で行います：

1. 依存関係のインストールとビルド
2. ブラウザで SUZURI Developer ページを開いてトークン取得を促す
3. `~/.claude/settings.json` への MCP サーバー設定の追加

完了後、Claude Code を再起動すれば利用可能になります。

## 手動セットアップ

### 1. リポジトリのクローンとビルド

```bash
git clone https://github.com/kurotaki_pepabo/suzuri-mcp-server.git
cd suzuri-mcp-server
npm install
npm run build
```

### 2. Claude Code に MCP サーバーを登録

`claude mcp add` コマンドで登録できます：

```bash
claude mcp add suzuri -e SUZURI_TOKEN=your-token-here -- node /path/to/suzuri-mcp-server/dist/index.mjs
```

例（クローンしたディレクトリ内で実行する場合）：

```bash
claude mcp add suzuri -e SUZURI_TOKEN=your-token-here -- node "$(pwd)/dist/index.mjs"
```

### 手動で設定ファイルを編集する場合

`~/.claude/settings.json` に以下を追加:

```json
{
  "mcpServers": {
    "suzuri": {
      "command": "node",
      "args": ["/path/to/suzuri-mcp-server/dist/index.mjs"],
      "env": {
        "SUZURI_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Claude Desktop での設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に同様の設定を追加:

```json
{
  "mcpServers": {
    "suzuri": {
      "command": "node",
      "args": ["/path/to/suzuri-mcp-server/dist/index.mjs"],
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

### Placement（配置）

| ツール | 説明 |
|--------|------|
| `get_placement_presets` | 配置プリセット（黄金パターン）一覧を取得 |
| `preview_product_placement` | 素材の配置をプレビュー（scale/offset指定） |
| `compare_placements` | 複数の配置パターンを一括比較 |
| `create_product_with_placement` | 配置を指定して商品を作成 |
| `analyze_reference_image` | 参考画像から配置パラメータを推定 |

#### インタラクティブな配置フロー

**パターンA: プリセットから選ぶ**
1. `get_placement_presets` で配置パターンの提案を受ける
2. `compare_placements` で複数パターンを比較プレビュー
3. `preview_product_placement` で微調整しながらプレビュー
4. `create_product_with_placement` で確定した配置で商品を作成

**パターンB: 参考画像から配置を真似る**
1. `analyze_reference_image` で参考画像をAIが分析し、配置パラメータを推定
2. `preview_product_placement` で推定パラメータをプレビュー
3. 微調整 → `create_product_with_placement` で確定

#### 配置プリセット一覧

| プリセット名 | ラベル | 説明 |
|-------------|--------|------|
| `center` | 中央配置 | 標準サイズで中央に配置 |
| `left_chest` | 左胸ワンポイント | 左胸に小さく配置 |
| `right_chest` | 右胸ワンポイント | 右胸に小さく配置 |
| `full_front` | 全面プリント | 大きく全面に配置 |
| `bottom_center` | 下部中央配置 | 下部中央に配置 |
| `top_center` | 上部中央配置 | 上部中央に配置 |
| `pocket_area` | ポケット位置 | 胸ポケット位置に小さく配置 |
| `mug_wrap` | マグカップ全面 | マグカップ表面を覆う配置 |
| `small_center` | 中央小サイズ | 中央にコンパクトに配置 |

### Choices（チョイス）

| ツール | 説明 |
|--------|------|
| `list_choices` | チョイス一覧を取得 |
| `create_choice` | チョイスを作成 |
| `update_choice` | チョイスを更新 |
| `delete_choice` | チョイスを削除 |

## 開発

```bash
npm run dev    # ウォッチモードでビルド
npm test       # テスト実行
npm run check  # リント・型チェック
```

## ライセンス

MIT
