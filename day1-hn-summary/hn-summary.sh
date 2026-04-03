#!/bin/bash

set -euo pipefail

CATEGORIZE=false
MIN_COMMENTS=0
FORMAT=markdown
while [[ $# -gt 0 ]]; do
  case "$1" in
    --categorize) CATEGORIZE=true; shift ;;
    --min-comments)
      [[ -n "${2:-}" ]] || { echo "--min-comments requires a number" >&2; exit 1; }
      MIN_COMMENTS="$2"; shift 2 ;;
    --format)
      [[ -n "${2:-}" ]] || { echo "--format requires markdown, html, or json" >&2; exit 1; }
      case "$2" in
        markdown|html|json) FORMAT="$2" ;;
        *) echo "Unknown format: $2 (choose markdown, html, or json)" >&2; exit 1 ;;
      esac
      shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

DATE=$(date '+%Y年%m月%d日')
TMP=$(mktemp)

./hn-top10.sh > "$TMP"

if [[ "$MIN_COMMENTS" -gt 0 ]]; then
  filtered=$(jq --argjson min "$MIN_COMMENTS" '[.[] | select(.comments >= $min)]' "$TMP")
  if [[ $(echo "$filtered" | jq 'length') -eq 0 ]]; then
    echo "コメント数が ${MIN_COMMENTS} 以上の記事はありません。" >&2
    rm -f "$TMP"
    exit 0
  fi
  echo "$filtered" > "$TMP"
fi

if [[ "$FORMAT" == "json" ]]; then
  cat "$TMP"
  rm -f "$TMP"
  exit 0
fi

echo "# Hacker News トップ10 サマリー — ${DATE}"
echo ""

if [[ "$FORMAT" == "html" ]]; then
  if $CATEGORIZE; then
    PROMPT="以下はHacker Newsのトップ10記事リスト（JSON形式）です。
今日の技術トレンドを日本語で3行にまとめ、
その後、記事をカテゴリ（例：AI・ML、セキュリティ、Web開発、ビジネス、その他）ごとにグループ化して、
各記事の1行サマリーをリスト形式で出力してください。
出力はHTML形式（<h2>/<h3>/<ul>/<li>/<p>/<a>タグを使用）でお願いします。コードブロックは使わず、HTMLのみ出力してください。"
  else
    PROMPT="以下はHacker Newsのトップ10記事リスト（JSON形式）です。
今日の技術トレンドを日本語で3行にまとめ、
その後、各記事の1行サマリーをリスト形式で出力してください。
出力はHTML形式（<h2>/<ul>/<li>/<p>/<a>タグを使用）でお願いします。コードブロックは使わず、HTMLのみ出力してください。"
  fi
else
  if $CATEGORIZE; then
    PROMPT="以下はHacker Newsのトップ10記事リスト（JSON形式）です。
今日の技術トレンドを日本語で3行にまとめ、
その後、記事をカテゴリ（例：AI・ML、セキュリティ、Web開発、ビジネス、その他）ごとにグループ化して、
各記事の1行サマリーを箇条書きで出力してください。
出力はMarkdown形式でお願いします。"
  else
    PROMPT="以下はHacker Newsのトップ10記事リスト（JSON形式）です。
今日の技術トレンドを日本語で3行にまとめ、
その後、各記事の1行サマリーを箇条書きで出力してください。
出力はMarkdown形式でお願いします。"
  fi
fi

claude -p "$PROMPT" < "$TMP"

rm -f "$TMP"
