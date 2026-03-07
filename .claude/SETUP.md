# Claude Code Workflow Setup

This repo includes custom Claude Code commands for an AI-assisted development workflow. Follow these steps to set up your environment.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed
- Access to the `cytoscape` Jira Cloud instance
- Write access to the `cytoscape/cytoscape-web` GitHub repo

## 1. GitHub MCP Server

Generate a fine-grained personal access token:

1. GitHub > Settings > Developer Settings > Personal Access Tokens > Fine-grained tokens
2. Set resource owner to your org (e.g., `cytoscape`)
3. Select the `cw5` repository (or all repos)
4. Under **Repository permissions**, set:
   - Contents: Read and write
   - Pull requests: Read and write
   - Issues: Read and write
   - Metadata: Read-only (auto-selected)
5. Generate and copy the token

Create a `.env` file in the project root (already in `.gitignore`):

```
GITHUB_PAT=your_token_here
```

Add the GitHub MCP server (run in your terminal, not in Claude Code):

```bash
claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer '"$(grep GITHUB_PAT .env | cut -d '=' -f2)"'"}}' -s project
```

## 2. Atlassian/Jira MCP Server

```bash
claude mcp add atlassian -s project --transport sse https://mcp.atlassian.com/v1/sse
```

On first use, a browser window will open for OAuth authentication with your Atlassian account.

## 3. Notification Sound (optional, macOS only)

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "afplay /System/Library/Sounds/Glass.aiff"
          }
        ]
      }
    ]
  }
}
```

## 4. Permissions (recommended allowlist)

The repo ships with a shared deny list (`.claude/settings.json`) that blocks dangerous operations for everyone — force push, pushes to main/development, hard resets, branch deletion, and destructive GitHub MCP actions.

For convenience, copy the recommended allowlist into your local settings. Create `.claude/settings.local.json` (already gitignored) and add:

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",

      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git branch*)",
      "Bash(git fetch*)",
      "Bash(git checkout development*)",
      "Bash(git checkout -b CW-*)",
      "Bash(git checkout CW-*)",
      "Bash(git add *)",
      "Bash(git rm --cached*)",
      "Bash(git commit *)",
      "Bash(git push origin CW-*)",
      "Bash(git push -u origin CW-*)",

      "Bash(npm run lint*)",
      "Bash(npm run test:unit*)",
      "Bash(npm run build*)",
      "Bash(npm install*)",

      "Bash(afplay *)",
      "Bash(ls *)",
      "Bash(mkdir *)",
      "Bash(which *)",

      "mcp__atlassian__*",
      "mcp__github__create_pull_request",
      "mcp__github__list_pull_requests",
      "mcp__github__pull_request_read",
      "mcp__github__get_file_contents",
      "mcp__github__list_commits",
      "mcp__github__search_code"
    ]
  }
}
```

This auto-approves safe operations (file edits, git on CW-* branches, lint/test/build, Jira read/write, GitHub PR tools). Everything else prompts for permission.

### Safety layers

| Layer | Scope | What it does |
|---|---|---|
| **Deny list** (`.claude/settings.json`) | Shared, committed | Blocks destructive operations for all team members |
| **Allow list** (`.claude/settings.local.json`) | Personal, local | Auto-approves safe operations (opt-in) |
| **Safety hook** (`.claude/hooks/pre-bash.sh`) | Shared, committed | Defense-in-depth — catches blocked patterns in bash commands |

## 5. Restart Claude Code

Exit and relaunch Claude Code so the MCP servers connect.

## Available Commands

| Command | Description |
|---|---|
| `/start-ticket` | Fetch next highest priority Jira ticket and start working on it |
| `/start-ticket CW-1234` | Work on a specific ticket |
| `/skip-ticket` | Skip current ticket, fetch next from queue |
| `/commit-push-pr` | Lint, review, commit, push, and create PR to `development` |
| `/fix-pr-comments` | Read and fix GitHub PR review comments |
| `/fix-pr-comments 42` | Fix comments on a specific PR |

## Workflow

```
/start-ticket          -> picks up highest priority ticket, transitions to In Progress
  ...discuss & implement...
  ...manual UI testing...
/commit-push-pr        -> lint, commit, push, create PR
  ...AI reviewer + human review on GitHub...
/fix-pr-comments       -> address review comments, push fixes
  ...approve & merge PR...
  ...Jira auto-transitions ticket to Done...
```
