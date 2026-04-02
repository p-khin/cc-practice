#!/bin/bash

set -euo pipefail

API_BASE="https://hacker-news.firebaseio.com/v0"

# トップ記事のID一覧を取得し、上位10件を抽出
top_ids=$(curl -s "${API_BASE}/topstories.json" | jq '.[0:10][]')

items="[]"
rank=1
for id in $top_ids; do
  item=$(curl -s "${API_BASE}/item/${id}.json")

  entry=$(echo "$item" | jq --argjson rank "$rank" '{
    rank: $rank,
    id: .id,
    title: .title,
    url: (.url // ("https://news.ycombinator.com/item?id=" + (.id | tostring))),
    score: .score
  }')

  items=$(echo "$items" | jq --argjson entry "$entry" '. + [$entry]')
  rank=$((rank + 1))
done

echo "$items" | jq '.'
