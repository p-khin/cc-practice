#!/bin/bash
set -euo pipefail

IDS=$(curl -s https://hacker-news.firebaseio.com/v0/topstories.json | jq '.[0:10][]')

for ID in $IDS; do
    curl -s "https://hacker-news.firebaseio.com/v0/item/${ID}.json"
    sleep 1
done | jq -s '.'
