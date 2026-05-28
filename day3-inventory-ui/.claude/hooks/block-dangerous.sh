#!/usr/bin/env bash
# Blocks dangerous shell commands via Claude Code PreToolUse hook.
# Exit 2 = block the tool call and show the message to Claude.

input=$(cat)

command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

if [[ -z "$command" ]]; then
  exit 0
fi

# rm (単体・-rf を含むすべての形式)
if printf '%s' "$command" | grep -qE '(^|[;&|`$( ])(sudo\s+)?rm\b'; then
  echo "BLOCKED: rm は危険なため実行できません。削除が必要な場合は手動で確認してください。" >&2
  exit 2
fi

# git push --force / --force-with-lease
if printf '%s' "$command" | grep -qE '(^|[;&|`$( ])git\s+push\b.*\s(--force|-f)\b'; then
  echo "BLOCKED: git push --force は危険なため実行できません。強制プッシュが必要な場合はユーザーに確認してください。" >&2
  exit 2
fi

exit 0
