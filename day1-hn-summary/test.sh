#!/bin/bash

exit 1  # temporary: trigger CI failure for notification test

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

# ── result ─────────────────────────────────────────────────────────────────
printf "\n──────────────────────────────\n"
printf "  Tests: %d  Pass: \033[32m%d\033[0m  Fail: \033[31m%d\033[0m\n" \
  "$((PASS+FAIL))" "$PASS" "$FAIL"
printf "──────────────────────────────\n"

[ "$FAIL" -eq 0 ]
