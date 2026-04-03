# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This project fetches Hacker News top articles via the official Firebase API and generates a Japanese-language Markdown summary using Claude Code's CLI (`claude -p`).

## Commands

```bash
# Fetch top 10 as JSON
./hn-top10.sh

# Generate full Japanese Markdown summary (requires claude CLI)
./hn-summary.sh

# Save summary to file
./hn-summary.sh > summary.md

# Run tests
./test.sh
```

## Architecture

Two scripts with a clear pipeline:

```
hn-top10.sh  →  JSON array (rank/id/title/url/score)  →  hn-summary.sh  →  claude -p  →  Markdown
```

- **`hn-top10.sh`**: Calls `topstories.json` for IDs, then `item/{id}.json` for each of the top 10. Builds a JSON array via `jq`. Missing `url` fields fall back to `https://news.ycombinator.com/item?id=<id>`.
- **`hn-summary.sh`**: Writes `hn-top10.sh` output to a `mktemp` file, then feeds it to `claude -p`. Direct piping fails due to a 3-second stdin timeout — the temp file workaround is intentional.
- **`test.sh`**: Pure-bash test runner (no external framework). Mocks `curl` and `claude` via `PATH` injection into temp directories. Tests cover: JSON validity, field completeness, rank ordering, URL fallback, error handling (curl failure, invalid URL response, downstream script failure).

## Key Constraints

- HN Firebase API: `https://hacker-news.firebaseio.com/v0` — add `sleep 1` between sequential requests to avoid rate limiting.
- All scripts use `set -euo pipefail`.
- Output language: Japanese. Output format: Markdown.
- Dependencies: `curl`, `jq`, `shellcheck`, `claude` (Claude Code CLI).
