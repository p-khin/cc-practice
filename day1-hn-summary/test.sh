#!/bin/bash

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# ── test framework ─────────────────────────────────────────────────────────
PASS=0; FAIL=0

ok() { printf "  \033[32mPASS\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
ng() { printf "  \033[31mFAIL\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }

# ── mock setup ─────────────────────────────────────────────────────────────
MOCK_DIR="$(mktemp -d)"
FAIL_DIR="$(mktemp -d)"
ERRTEST_DIR="$(mktemp -d)"
BADURL_DIR="$(mktemp -d)"
trap 'rm -rf "$MOCK_DIR" "$FAIL_DIR" "$ERRTEST_DIR" "$BADURL_DIR"' EXIT

# Normal mock curl:
#   topstories.json → 12 IDs (script takes first 10: 101..110)
#   item/110.json   → no "url" field (tests fallback)
#   others          → standard item JSON
cat > "$MOCK_DIR/curl" <<'EOF'
#!/bin/bash
URL="${@: -1}"
if [[ "$URL" == *"topstories.json" ]]; then
  echo '[101,102,103,104,105,106,107,108,109,110,111,112]'
elif [[ "$URL" =~ /item/([0-9]+)\.json ]]; then
  ID="${BASH_REMATCH[1]}"
  if [[ "$ID" == "110" ]]; then
    echo "{\"id\":$ID,\"title\":\"No-URL Article\",\"score\":42}"
  else
    echo "{\"id\":$ID,\"title\":\"Article $ID\",\"url\":\"https://example.com/$ID\",\"score\":99}"
  fi
fi
EOF
chmod +x "$MOCK_DIR/curl"

# Mock claude: drain stdin, output fixed string
cat > "$MOCK_DIR/claude" <<'EOF'
#!/bin/bash
cat /dev/stdin > /dev/null
echo "モック要約テキスト"
EOF
chmod +x "$MOCK_DIR/claude"

# Failing mock curl (exits 1 always)
cat > "$FAIL_DIR/curl" <<'EOF'
#!/bin/bash
exit 1
EOF
chmod +x "$FAIL_DIR/curl"

ORIG_PATH="$PATH"
MOCK_PATH="$MOCK_DIR:$ORIG_PATH"
FAIL_PATH="$FAIL_DIR:$ORIG_PATH"

# Invalid URL mock curl: exits 0 but returns non-JSON body (simulates HTTP error from invalid URL)
cat > "$BADURL_DIR/curl" <<'EOF'
#!/bin/bash
echo "404 Not Found"
EOF
chmod +x "$BADURL_DIR/curl"

BADURL_PATH="$BADURL_DIR:$ORIG_PATH"

# ── hn-top10.sh ────────────────────────────────────────────────────────────
printf "\n=== hn-top10.sh ===\n"

if OUTPUT=$(env PATH="$MOCK_PATH" bash ./hn-top10.sh 2>/dev/null); then

  # 1. valid JSON
  if echo "$OUTPUT" | jq . > /dev/null 2>&1; then
    ok "output is valid JSON"
  else
    ng "output is valid JSON"
  fi

  # 2. exactly 10 items
  COUNT=$(echo "$OUTPUT" | jq 'length')
  if [ "$COUNT" -eq 10 ]; then
    ok "output has exactly 10 items"
  else
    ng "output has exactly 10 items (got $COUNT)"
  fi

  # 3. all items have required fields
  MISSING=$(echo "$OUTPUT" | jq '[.[] | select(
    (.rank  == null) or
    (.id    == null) or
    (.title == null) or
    (.url   == null) or
    (.score == null)
  )] | length')
  if [ "$MISSING" -eq 0 ]; then
    ok "all items have rank/id/title/url/score"
  else
    ng "all items have rank/id/title/url/score ($MISSING items missing fields)"
  fi

  # 4. rank is 1..10 in order
  RANKS=$(echo "$OUTPUT" | jq -c '[.[].rank]')
  if [ "$RANKS" = "[1,2,3,4,5,6,7,8,9,10]" ]; then
    ok "ranks are 1..10 in order"
  else
    ng "ranks are 1..10 in order (got $RANKS)"
  fi

  # 5. url fallback: item 110 has no url → should get HN permalink
  FALLBACK=$(echo "$OUTPUT" | jq -r '.[] | select(.id == 110) | .url')
  if [ "$FALLBACK" = "https://news.ycombinator.com/item?id=110" ]; then
    ok "url falls back to HN permalink when missing"
  else
    ng "url falls back to HN permalink when missing (got: $FALLBACK)"
  fi

else
  ng "hn-top10.sh ran successfully (unexpected failure)"
fi

# 6. exits non-zero when curl fails
if ! env PATH="$FAIL_PATH" bash ./hn-top10.sh 2>/dev/null; then
  ok "exits non-zero when curl fails"
else
  ng "exits non-zero when curl fails"
fi

# 7. exits non-zero when URL returns invalid (empty) response
ERRLOG=$(mktemp)
EC=0
env PATH="$BADURL_PATH" bash ./hn-top10.sh >/dev/null 2>"$ERRLOG" || EC=$?
if [ "$EC" -ne 0 ]; then
  ok "exits non-zero when URL returns invalid response"
else
  ng "exits non-zero when URL returns invalid response"
fi

# 8. prints error message when URL returns invalid response
if [ -s "$ERRLOG" ]; then
  ok "prints error message when URL returns invalid response"
else
  ng "prints error message when URL returns invalid response"
fi
rm -f "$ERRLOG"

# ── hn-summary.sh ──────────────────────────────────────────────────────────
printf "\n=== hn-summary.sh ===\n"

if SUMMARY=$(env PATH="$MOCK_PATH" bash ./hn-summary.sh 2>/dev/null); then

  # 7. header line format
  FIRST_LINE=$(echo "$SUMMARY" | head -1)
  if [[ "$FIRST_LINE" == "# Hacker News トップ10 サマリー —"* ]]; then
    ok "output starts with correct header"
  else
    ng "output starts with correct header (got: $FIRST_LINE)"
  fi

  # 8. header contains date in YYYY年MM月DD日 format
  if echo "$FIRST_LINE" | grep -qE '[0-9]{4}年[0-9]{2}月[0-9]{2}日'; then
    ok "header contains date in YYYY年MM月DD日 format"
  else
    ng "header contains date in YYYY年MM月DD日 format"
  fi

  # 9. contains claude's response
  if echo "$SUMMARY" | grep -qF "モック要約テキスト"; then
    ok "output contains claude's response"
  else
    ng "output contains claude's response"
  fi

else
  ng "hn-summary.sh ran successfully (unexpected failure)"
fi

# 10. exits non-zero when hn-top10.sh fails
cp ./hn-summary.sh "$ERRTEST_DIR/"
cat > "$ERRTEST_DIR/hn-top10.sh" <<'EOF'
#!/bin/bash
exit 1
EOF
chmod +x "$ERRTEST_DIR/hn-top10.sh"

if ! (cd "$ERRTEST_DIR" && env PATH="$MOCK_PATH" bash ./hn-summary.sh 2>/dev/null); then
  ok "exits non-zero when hn-top10.sh fails"
else
  ng "exits non-zero when hn-top10.sh fails"
fi

# ── news-summary.sh ────────────────────────────────────────────────────────
printf "\n=== news-summary.sh ===\n"

# Mock curl for news-summary.sh: handles HN, Reddit, Lobsters, Dev.to
NS_MOCK_DIR="$(mktemp -d)"
trap 'rm -rf "$NS_MOCK_DIR"' EXIT

cat > "$NS_MOCK_DIR/sleep" <<'EOF'
#!/bin/bash
exit 0
EOF
chmod +x "$NS_MOCK_DIR/sleep"

cat > "$NS_MOCK_DIR/curl" <<'EOF'
#!/bin/bash
# Extract URL: the only arg starting with http
URL=""
for arg in "$@"; do
  [[ "$arg" == http* ]] && URL="$arg"
done

if [[ "$URL" == *"topstories.json"* ]]; then
  echo '[1,2,3,4,5,6,7,8,9,10,11,12]'
elif [[ "$URL" =~ /item/([0-9]+)\.json ]]; then
  ID="${BASH_REMATCH[1]}"
  echo "{\"id\":$ID,\"title\":\"HN Article $ID\",\"url\":\"https://example.com/hn/$ID\",\"score\":$((ID*10)),\"descendants\":$((ID*2))}"
elif [[ "$URL" == *"reddit.com"* ]]; then
  items=""
  for i in $(seq 1 10); do
    [[ -n "$items" ]] && items="$items,"
    items="${items}{\"kind\":\"t3\",\"data\":{\"title\":\"Reddit Article $i\",\"url\":\"https://example.com/r/$i\",\"score\":$((i*5)),\"num_comments\":$i}}"
  done
  echo "{\"data\":{\"children\":[$items]}}"
elif [[ "$URL" == *"lobste.rs"* ]]; then
  items=""
  for i in $(seq 1 10); do
    [[ -n "$items" ]] && items="$items,"
    items="${items}{\"title\":\"Lobsters Article $i\",\"url\":\"https://example.com/l/$i\",\"score\":$((i*3)),\"comment_count\":$i}"
  done
  echo "[$items]"
elif [[ "$URL" == *"dev.to"* ]]; then
  items=""
  for i in $(seq 1 10); do
    [[ -n "$items" ]] && items="$items,"
    items="${items}{\"title\":\"DevTo Article $i\",\"url\":\"https://dev.to/article-$i\",\"public_reactions_count\":$((i*2)),\"comments_count\":$i}"
  done
  echo "[$items]"
fi
EOF
chmod +x "$NS_MOCK_DIR/curl"

NS_MOCK_PATH="$NS_MOCK_DIR:$ORIG_PATH"

# Helper: run news-summary.sh with mock curl and given --sources
run_ns() {
  env PATH="$NS_MOCK_PATH" bash ./news-summary.sh --sources "$1" 2>/dev/null
}

# Test each adapter individually
for src in hn reddit lobsters devto; do
  OUTPUT=$(run_ns "$src")

  if echo "$OUTPUT" | jq . > /dev/null 2>&1; then
    ok "$src: output is valid JSON"
  else
    ng "$src: output is valid JSON"
  fi

  COUNT=$(echo "$OUTPUT" | jq 'length')
  if [[ "$COUNT" -eq 10 ]]; then
    ok "$src: output has 10 items"
  else
    ng "$src: output has 10 items (got $COUNT)"
  fi

  MISSING=$(echo "$OUTPUT" | jq '[.[] | select(
    .title == null or .score == null or .url == null or
    .source == null or .comments == null or .normalized_score == null
  )] | length')
  if [[ "$MISSING" -eq 0 ]]; then
    ok "$src: all items have required fields"
  else
    ng "$src: all items have required fields ($MISSING missing)"
  fi

  CORRECT_SRC=$(echo "$OUTPUT" | jq --arg s "$src" '[.[] | select(.source == $s)] | length')
  if [[ "$CORRECT_SRC" -eq 10 ]]; then
    ok "$src: source field is '$src'"
  else
    ng "$src: source field is '$src' (got $CORRECT_SRC items with correct source)"
  fi
done

# Test unified output with multiple sources
MULTI=$(run_ns "reddit,lobsters")
MULTI_COUNT=$(echo "$MULTI" | jq 'length')
if [[ "$MULTI_COUNT" -eq 20 ]]; then
  ok "--sources reddit,lobsters: combined output has 20 items"
else
  ng "--sources reddit,lobsters: combined output has 20 items (got $MULTI_COUNT)"
fi

# Test normalized_score is 0-100
MAX_SCORE=$(echo "$MULTI" | jq '[.[].normalized_score] | max')
MIN_SCORE=$(echo "$MULTI" | jq '[.[].normalized_score] | min')
if [[ "$MAX_SCORE" -eq 100 && "$MIN_SCORE" -ge 0 ]]; then
  ok "normalized_score range is 0-100"
else
  ng "normalized_score range is 0-100 (max=$MAX_SCORE min=$MIN_SCORE)"
fi

# Test sorted by normalized_score descending (first >= last)
FIRST=$(echo "$MULTI" | jq '.[0].normalized_score')
LAST=$(echo "$MULTI" | jq '.[-1].normalized_score')
if [[ "$FIRST" -ge "$LAST" ]]; then
  ok "output is sorted by normalized_score descending"
else
  ng "output is sorted by normalized_score descending (first=$FIRST last=$LAST)"
fi

# Test unknown source exits non-zero
if ! run_ns "unknown" 2>/dev/null; then
  ok "unknown source exits non-zero"
else
  ng "unknown source exits non-zero"
fi

# ── result ─────────────────────────────────────────────────────────────────
printf "\n──────────────────────────────\n"
printf "  Tests: %d  Pass: \033[32m%d\033[0m  Fail: \033[31m%d\033[0m\n" \
  "$((PASS+FAIL))" "$PASS" "$FAIL"
printf "──────────────────────────────\n"

[ "$FAIL" -eq 0 ]
