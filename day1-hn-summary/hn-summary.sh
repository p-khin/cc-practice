#!/bin/bash

set -euo pipefail

DATE=$(date '+%Y年%m月%d日')
TMP=$(mktemp)

./hn-top10.sh > "$TMP"

echo "# Hacker News トップ10 サマリー — ${DATE}"
echo ""

claude -p "以下はHacker Newsのトップ10記事リスト（JSON形式）です。
今日の技術トレンドを日本語で3行にまとめ、
その後、各記事の1行サマリーを箇条書きで出力してください。
出力はMarkdown形式でお願いします。" < "$TMP"

rm -f "$TMP"
