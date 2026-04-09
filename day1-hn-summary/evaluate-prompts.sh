#!/bin/bash

set -euo pipefail

OUTPUT="prompt-evaluation.csv"

# --- Prompt definitions ---
PROMPT_A="要約して"
PROMPT_B="技術トレンドの観点で、各記事を1行で要約し、全体の傾向を3行でまとめて"
PROMPT_C="あなたはCTOです。技術戦略に関連するトピックを抽出し、経営層向けサマリーを作成して"

# Scoring prompt: instructs Claude to output ONLY "N,N,N"
SCORE_PROMPT='以下のニュースサマリーを3つの基準で1〜5のスコアで評価してください。
必ず「数字,数字,数字」の形式のみで出力してください。説明や改行は不要です。

評価基準:
1. 情報量: 重要な情報がどれだけ含まれているか
2. 正確性: 情報が正確で誤解を招かないか
3. 可読性: 読みやすく理解しやすいか

サマリー:'

# --- Fetch data once ---
echo "Fetching HN top 10..." >&2
DATA_TMP=$(mktemp)
trap 'rm -f "$DATA_TMP"' EXIT
./hn-top10.sh > "$DATA_TMP"

# --- CSV header ---
echo "prompt,information,accuracy,readability,total" > "$OUTPUT"

best_label=""
best_total=0

# --- Evaluate each prompt ---
evaluate() {
  local label="$1"
  local prompt="$2"

  echo "Generating summary for Prompt ${label}..." >&2
  local summary_tmp score_input_tmp
  summary_tmp=$(mktemp)
  score_input_tmp=$(mktemp)

  claude -p "$prompt" < "$DATA_TMP" > "$summary_tmp"

  # Build scorer input: combine scoring instructions + summary into one file
  printf '%s\n' "$SCORE_PROMPT" > "$score_input_tmp"
  cat "$summary_tmp" >> "$score_input_tmp"

  echo "Scoring Prompt ${label}..." >&2
  local raw_scores
  raw_scores=$(claude -p "上記の指示に従いスコアを出力してください。" < "$score_input_tmp" \
    | tr -d ' \n' | grep -o '[1-5],[1-5],[1-5]' | head -1)

  rm -f "$summary_tmp" "$score_input_tmp"

  if [[ -z "$raw_scores" ]]; then
    echo "Warning: could not parse scores for Prompt ${label}, defaulting to 0,0,0" >&2
    raw_scores="0,0,0"
  fi

  local info acc read_score total
  info=$(echo "$raw_scores"  | cut -d',' -f1)
  acc=$(echo "$raw_scores"   | cut -d',' -f2)
  read_score=$(echo "$raw_scores" | cut -d',' -f3)
  total=$((info + acc + read_score))

  echo "${label},${info},${acc},${read_score},${total}" >> "$OUTPUT"
  echo "  Prompt ${label}: information=${info} accuracy=${acc} readability=${read_score} total=${total}" >&2

  # Track best
  if [[ "$total" -gt "$best_total" ]]; then
    best_total="$total"
    best_label="$label"
  fi
}

evaluate "A" "$PROMPT_A"
evaluate "B" "$PROMPT_B"
evaluate "C" "$PROMPT_C"

echo "" >&2
echo "Results saved to ${OUTPUT}" >&2
echo "Best prompt: ${best_label} (total=${best_total})" >&2

# --- Update CLAUDE.md ---
BEST_PROMPT_TEXT=""
case "$best_label" in
  A) BEST_PROMPT_TEXT="$PROMPT_A" ;;
  B) BEST_PROMPT_TEXT="$PROMPT_B" ;;
  C) BEST_PROMPT_TEXT="$PROMPT_C" ;;
esac

# Remove any previous evaluation section, then append fresh results
CLAUDE_MD="CLAUDE.md"
# Strip old section if present
if grep -q "## Prompt Evaluation" "$CLAUDE_MD"; then
  sed -i '/^## Prompt Evaluation/,$d' "$CLAUDE_MD"
fi

cat >> "$CLAUDE_MD" <<EOF

## Prompt Evaluation

Last run: $(date '+%Y-%m-%d')

| Prompt | Information | Accuracy | Readability | Total |
|--------|-------------|----------|-------------|-------|
EOF

while IFS=',' read -r label info acc read_score total; do
  [[ "$label" == "prompt" ]] && continue  # skip header
  marker=""
  [[ "$label" == "$best_label" ]] && marker=" ← best"
  echo "| ${label} | ${info} | ${acc} | ${read_score} | ${total}${marker} |" >> "$CLAUDE_MD"
done < "$OUTPUT"

cat >> "$CLAUDE_MD" <<EOF

**Best prompt: ${best_label}**

\`\`\`
${BEST_PROMPT_TEXT}
\`\`\`
EOF

echo "CLAUDE.md updated with best prompt: ${best_label}" >&2
