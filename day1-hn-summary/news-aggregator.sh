#!/bin/bash

set -euo pipefail

SOURCES="hn,reddit,lobsters"
SUMMARY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      [[ -n "${2:-}" ]] || { echo "--source requires a value" >&2; exit 1; }
      SOURCES="$2"; shift 2 ;;
    --summary) SUMMARY=true; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

fetch_hn() {
  local api="https://hacker-news.firebaseio.com/v0"
  local ids
  ids=$(curl -s "${api}/topstories.json" | jq '.[0:10][]')

  for id in $ids; do
    curl -s "${api}/item/${id}.json"
    sleep 1
  done | jq -s '[.[] | {
    title: .title,
    score: .score,
    url: (.url // ("https://news.ycombinator.com/item?id=" + (.id | tostring))),
    source: "hn"
  }]'
}

fetch_reddit() {
  curl -s \
    -H "User-Agent: news-aggregator/1.0" \
    "https://www.reddit.com/r/programming/top.json?limit=10" \
  | jq '[.data.children[].data | {
    title: .title,
    score: .score,
    url: .url,
    source: "reddit"
  }]'
}

fetch_lobsters() {
  curl -s "https://lobste.rs/hottest.json" \
  | jq '[.[0:10] | .[] | {
    title: .title,
    score: .score,
    url: .url,
    source: "lobsters"
  }]'
}

results="[]"
IFS=',' read -ra source_list <<< "$SOURCES"
for source in "${source_list[@]}"; do
  case "$source" in
    hn)       data=$(fetch_hn) ;;
    reddit)   data=$(fetch_reddit) ;;
    lobsters) data=$(fetch_lobsters) ;;
    *) echo "Unknown source: $source (choose hn, reddit, lobsters)" >&2; exit 1 ;;
  esac
  results=$(jq -n --argjson a "$results" --argjson b "$data" '$a + $b')
done

normalized=$(echo "$results" | jq '
  (map(.score) | max) as $max |
  (map(.score) | min) as $min |
  (if $max == $min then 1 else $max - $min end) as $range |
  map(. + {normalized_score: (((.score - $min) / $range * 100) | round)}) |
  sort_by(-.normalized_score)
')

if $SUMMARY; then
  DATE=$(date '+%Y年%m月%d日')
  TMP=$(mktemp)
  echo "$normalized" > "$TMP"
  echo "# ニュースアグリゲーター サマリー — ${DATE}"
  echo ""
  claude -p "以下は複数ソース（Hacker News・Reddit r/programming・Lobsters）の技術ニュース記事リスト（JSON形式）です。
normalized_scoreで正規化済みのスコア順に並んでいます。
今日の技術トレンドを日本語で3行にまとめ、
その後、各記事の1行サマリーをスコア順の箇条書きで出力してください（sourceも明記）。
出力はMarkdown形式でお願いします。" < "$TMP"
  rm -f "$TMP"
else
  echo "$normalized"
fi
