#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

DB="${HN_HISTORY_DB:-${SCRIPT_DIR}/hn-history.db}"
SHOW_DIFF=false
SHOW_TREND=false
SHOW_STATS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --diff)  SHOW_DIFF=true;  shift ;;
    --trend) SHOW_TREND=true; shift ;;
    --stats) SHOW_STATS=true; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "Error: sqlite3 is required but not installed." >&2
  exit 1
fi

# ── database ──────────────────────────────────────────────────────────────

init_db() {
  sqlite3 "$DB" <<'SQL'
CREATE TABLE IF NOT EXISTS runs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS articles (
  row_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     INTEGER NOT NULL,
  hn_id      INTEGER,
  title      TEXT,
  score      INTEGER,
  url        TEXT,
  source     TEXT DEFAULT 'hn',
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
SQL
}

cleanup_old_data() {
  sqlite3 "$DB" <<'SQL'
DELETE FROM articles WHERE fetched_at < datetime('now', '-7 days');
DELETE FROM runs    WHERE fetched_at < datetime('now', '-7 days');
SQL
}

save_articles() {
  local data="$1" run_id="$2"
  local jq_script sql_tmp
  jq_script=$(mktemp)
  sql_tmp=$(mktemp)

  # Build INSERT statements; use sq() to escape single quotes for SQLite
  cat > "$jq_script" <<'JQ'
def sq: gsub("'"; "''");
.[] |
"INSERT INTO articles(run_id,hn_id,title,score,url,source) VALUES(" +
  ($run_id|tostring) + "," +
  ((.id // 0)|tostring) + "," +
  "'" + ((.title // "")|sq) + "'," +
  ((.score // 0)|tostring) + "," +
  "'" + ((.url // "")|sq) + "'," +
  "'hn');"
JQ

  {
    echo "BEGIN;"
    echo "$data" | jq -rf "$jq_script" --argjson run_id "$run_id"
    echo "COMMIT;"
  } > "$sql_tmp"

  sqlite3 "$DB" < "$sql_tmp"
  rm -f "$jq_script" "$sql_tmp"
}

# ── display modes ─────────────────────────────────────────────────────────

show_diff() {
  local latest prev
  latest=$(sqlite3 "$DB" "SELECT id FROM runs ORDER BY id DESC LIMIT 1;")
  prev=$(sqlite3   "$DB" "SELECT id FROM runs ORDER BY id DESC LIMIT 1 OFFSET 1;")

  if [[ -z "$prev" ]]; then
    echo "No previous run available for comparison."
    return
  fi

  echo "## Diff: Run #${prev} → Run #${latest}"
  echo ""
  echo "### New articles"
  sqlite3 "$DB" \
    "SELECT '+ ' || title || ' (score: ' || score || ')'
     FROM articles
     WHERE run_id = ${latest}
       AND hn_id NOT IN (SELECT hn_id FROM articles WHERE run_id = ${prev})
     ORDER BY score DESC;"

  echo ""
  echo "### Removed articles"
  sqlite3 "$DB" \
    "SELECT '- ' || title || ' (score: ' || score || ')'
     FROM articles
     WHERE run_id = ${prev}
       AND hn_id NOT IN (SELECT hn_id FROM articles WHERE run_id = ${latest})
     ORDER BY score DESC;"
}

show_trend() {
  local run_count
  run_count=$(sqlite3 "$DB" "SELECT COUNT(*) FROM runs;")
  if [[ "$run_count" -eq 0 ]]; then
    echo "No data yet. Run without options to fetch articles first." >&2
    return
  fi

  echo "## Category Trends"
  echo ""

  local jq_script
  jq_script=$(mktemp)
  cat > "$jq_script" <<'JQ'
def category(t):
  if   (t | test("AI|ML|LLM|GPT|[Nn]eural|[Mm]achine [Ll]earning|[Dd]eep [Ll]earning"; "i")) then "AI/ML"
  elif (t | test("[Ss]ecurity|CVE|[Hh]ack|[Vv]uln|[Bb]reach|[Mm]alware"; "i")) then "Security"
  elif (t | test("[Ww]eb|CSS|HTML|JavaScript|TypeScript|React|[Bb]rowser|[Ff]rontend"; "i")) then "Web"
  elif (t | test("Rust|\\bGo\\b|C\\+\\+|[Cc]ompiler|[Kk]ernel|Linux|[Ss]ystems"; "i")) then "Systems"
  elif (t | test("[Ss]tartup|[Ff]und|[Bb]usiness|[Cc]ompan|[Aa]cquir"; "i")) then "Business"
  else "Other"
  end;
group_by(.run_id) |
.[] |
"Run #\(.[0].run_id): " +
(map(category(.title)) | group_by(.) | map("\(.[0]): \(length)") | join(" | "))
JQ

  sqlite3 -json "$DB" "SELECT run_id, title FROM articles ORDER BY run_id;" \
    | jq -rf "$jq_script"
  rm -f "$jq_script"
}

show_stats() {
  local run_count
  run_count=$(sqlite3 "$DB" "SELECT COUNT(*) FROM runs;")
  if [[ "$run_count" -eq 0 ]]; then
    echo "No data yet. Run without options to fetch articles first." >&2
    return
  fi

  echo "## Statistics"
  echo ""
  sqlite3 "$DB" <<'SQL'
SELECT '- Total runs: '            || COUNT(*)                                   FROM runs;
SELECT '- Total articles tracked: '|| COUNT(*)                                   FROM articles;
SELECT '- Average score: '         || CAST(ROUND(AVG(CAST(score AS REAL))) AS INTEGER) FROM articles WHERE score > 0;
SELECT '- Highest score: '         || MAX(score)                                 FROM articles;
SELECT '- Date range: '            || MIN(fetched_at) || ' to ' || MAX(fetched_at) FROM runs;
SQL
}

# ── main ──────────────────────────────────────────────────────────────────

init_db

if $SHOW_STATS; then show_stats; exit 0; fi
if $SHOW_TREND; then show_trend; exit 0; fi

# Fetch and save
data=$(./hn-top10.sh)
item_count=$(echo "$data" | jq 'length')

run_id=$(sqlite3 "$DB" \
  "INSERT INTO runs (fetched_at) VALUES (datetime('now')); SELECT last_insert_rowid();")

save_articles "$data" "$run_id"
cleanup_old_data

echo "Saved ${item_count} articles (run #${run_id})." >&2

if $SHOW_DIFF; then
  show_diff
fi
