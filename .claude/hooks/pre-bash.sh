#!/bin/bash
# Safety hook: block dangerous operations as a fallback layer
# The permissions deny list is the primary guard — this is defense in depth

COMMAND="$1"

BLOCKED_PATTERNS=(
  "push --force"
  "push origin main"
  "push origin master"
  "push origin development"
  "reset --hard"
  "branch -D"
  "clean -f"
  "rm -rf"
  "drop database"
  "truncate table"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qF "$pattern"; then
    echo "BLOCKED: Dangerous operation detected — '$pattern'"
    echo "If you need to run this, do it manually outside Claude Code."
    exit 1
  fi
done
