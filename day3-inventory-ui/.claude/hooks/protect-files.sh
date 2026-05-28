#!/usr/bin/env bash
# Blocks edits to sensitive files via Claude Code PreToolUse hook.
# Exit 2 = block the tool call.

input=$(cat)

file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

if [[ -z "$file_path" ]]; then
  exit 0
fi

basename=$(basename "$file_path")

case "$basename" in
  .env | .env.* )
    echo "BLOCKED: .env ファイルは保護されています。直接編集する場合はエディタを使用してください。" >&2
    exit 2
    ;;
  package-lock.json )
    echo "BLOCKED: package-lock.json は npm が自動管理するファイルです。直接編集はできません。" >&2
    exit 2
    ;;
esac

exit 0
