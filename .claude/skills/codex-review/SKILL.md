---
name: codex
description: Run code review and analysis using OpenAI Codex CLI. Triggers: "codex", "code review", "review", "analyze", "/codex"
---

# Codex

Code review and analysis skill using Codex CLI.

## Command

```bash
codex exec --full-auto --sandbox read-only --cd <project_directory> "<request>"
```

## Parameters

| Parameter             | Description                         |
| --------------------- | ----------------------------------- |
| `--full-auto`         | Fully autonomous mode               |
| `--sandbox read-only` | Read-only sandbox for safe analysis |
| `--cd <dir>`          | Target project directory            |
| `"<request>"`         | Request in natural language         |

## Examples

### Code Review

```bash
codex exec --full-auto --sandbox read-only --cd /path/to/project "Review this project and suggest improvements"
```

### Bug Investigation

```bash
codex exec --full-auto --sandbox read-only --cd /path/to/project "Investigate why authentication fails"
```

## Workflow

1. Receive user request
2. Identify target project directory
3. Execute Codex with the command above
4. Report results to user
