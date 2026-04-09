#!/bin/bash

set -euo pipefail

SOURCES="hn,reddit,lobsters,devto"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sources)
      [[ -n "${2:-}" ]] || { echo "--sources requires a value" >&2; exit 1; }
      SOURCES="$2"; shift 2 ;;
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
    source: "hn",
    comments: (.descendants // 0)
  }]'
}

fetch_reddit() {
  curl -s \
    -H "User-Agent: news-summary/1.0" \
    "https://www.reddit.com/r/programming/top.json?limit=10" \
  | jq '[.data.children[].data | {
    title: .title,
    score: .score,
    url: .url,
    source: "reddit",
    comments: .num_comments
  }]'
}

fetch_lobsters() {
  curl -s "https://lobste.rs/hottest.json" \
  | jq '[.[0:10] | .[] | {
    title: .title,
    score: .score,
    url: .url,
    source: "lobsters",
    comments: .comment_count
  }]'
}

fetch_devto() {
  curl -s "https://dev.to/api/articles?top=1&per_page=10" \
  | jq '[.[] | {
    title: .title,
    score: .public_reactions_count,
    url: .url,
    source: "devto",
    comments: .comments_count
  }]'
}

results="[]"
IFS=',' read -ra source_list <<< "$SOURCES"
for source in "${source_list[@]}"; do
  case "$source" in
    hn)       data=$(fetch_hn) ;;
    reddit)   data=$(fetch_reddit) ;;
    lobsters) data=$(fetch_lobsters) ;;
    devto)    data=$(fetch_devto) ;;
    *) echo "Unknown source: $source (choose hn, reddit, lobsters, devto)" >&2; exit 1 ;;
  esac
  results=$(jq -n --argjson a "$results" --argjson b "$data" '$a + $b')
done

echo "$results" | jq '
  (map(.score) | max) as $max |
  (map(.score) | min) as $min |
  (if $max == $min then 1 else $max - $min end) as $range |
  map(. + {normalized_score: (((.score - $min) / $range * 100) | round)}) |
  sort_by(-.normalized_score)
'
