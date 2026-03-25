#!/bin/bash
set -e

echo "=== SUZURI MCP Server セットアップ ==="
echo ""

# ビルド
echo "依存関係をインストールしています..."
npm install --silent
echo "ビルドしています..."
npm run build --silent

DIST_PATH="$(cd "$(dirname "$0")" && pwd)/dist/index.mjs"

# トークン入力
echo ""
echo "SUZURI APIトークンが必要です。"
echo "ブラウザで SUZURI Developer ページを開きます..."
echo "表示されたアクセストークンをコピーしてください。"
echo ""

# macOS / Linux でブラウザを開く
if command -v open &> /dev/null; then
  open "https://suzuri.jp/developer/apps"
elif command -v xdg-open &> /dev/null; then
  xdg-open "https://suzuri.jp/developer/apps"
else
  echo "ブラウザを自動で開けませんでした。以下のURLを開いてください:"
  echo "  https://suzuri.jp/developer/apps"
fi

echo ""
read -rp "コピーしたトークンを貼り付けてください: " SUZURI_TOKEN

if [ -z "$SUZURI_TOKEN" ]; then
  echo "エラー: トークンが入力されていません。"
  exit 1
fi

# Claude Code の設定
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
mkdir -p "$HOME/.claude"

if [ -f "$CLAUDE_SETTINGS" ]; then
  # 既存の設定にマージ
  if command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      const path = '$CLAUDE_SETTINGS';
      const settings = JSON.parse(fs.readFileSync(path, 'utf8'));
      if (!settings.mcpServers) settings.mcpServers = {};
      settings.mcpServers.suzuri = {
        command: 'node',
        args: ['$DIST_PATH'],
        env: { SUZURI_TOKEN: '$SUZURI_TOKEN' }
      };
      fs.writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
    "
    echo ""
    echo "Claude Code の設定を更新しました: $CLAUDE_SETTINGS"
  else
    echo "エラー: node が見つかりません。"
    exit 1
  fi
else
  cat > "$CLAUDE_SETTINGS" << EOF
{
  "mcpServers": {
    "suzuri": {
      "command": "node",
      "args": ["$DIST_PATH"],
      "env": {
        "SUZURI_TOKEN": "$SUZURI_TOKEN"
      }
    }
  }
}
EOF
  echo ""
  echo "Claude Code の設定を作成しました: $CLAUDE_SETTINGS"
fi

echo ""
echo "=== セットアップ完了 ==="
echo "Claude Code を再起動すると SUZURI MCP サーバーが利用可能になります。"
