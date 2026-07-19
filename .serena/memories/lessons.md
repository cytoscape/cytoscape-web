# Lessons Learned

> Shared across all AI agents. Append new entries after corrections or unexpected failures.
> Format: `- [YYYY-MM-DD] <category>: <lesson>`

## Coding Patterns

- [2026-03-04] enableMapSet: Any new standalone test entry point MUST call `enableMapSet()` before Immer can handle Map/Set — omitting it causes cryptic test failures.
- [2026-03-04] App API: Core functions in `src/app-api/core/` must have zero React imports. Use `useXxxStore.getState()` instead of hooks.
- [2026-03-04] App API: All public API functions must return `ApiResult<T>` — never throw across the API boundary.
- [2026-03-04] Serialization: Before saving to IndexedDB, proxy objects must be converted with `toPlainObject()`. Map-based data needs specialized serializers.

## Build & CI

- [2026-03-04] Import sorting: Import sorting is no longer lint-enforced after the oxlint migration; keep imports sorted by convention.
- [2026-03-04] No `console.log`: Production builds strip direct `console.*()` calls through Vite's Oxc minifier. Use the `debug` logger from `src/debug.ts`.

## Agent Workflow

- [2026-03-04] Memory consolidation: AGENTS.md is the single source of truth for project context; CLAUDE.md includes it with `@AGENTS.md`. `.serena/memories/` should only contain lessons (this file) and task checklists — not duplicated agent context.
- [2026-07-15] Git sandbox: Branch merges may require elevated permission because the workspace sandbox can read `.git` but cannot create `.git/ORIG_HEAD.lock`.
- [2026-07-15] Commit convention: When Codex makes a commit, prefix the commit message with `Codex: `.
- [2026-07-15] Vitest targeting: Passing a source file such as `src/features/SyncTabs.tsx` to `vitest run` exits 1 when no matching test file exists; locate a test first or run the full unit suite.
- [2026-07-15] Shell quoting: Put ripgrep patterns containing Markdown backticks in single quotes (or split them into fixed-string searches); unescaped backticks inside a double-quoted shell command trigger command substitution or an unmatched-quote failure.
- [2026-07-15] Tool wrapper quoting: JavaScript passed to the orchestration wrapper must safely encode shell commands that contain quote characters; prefer a template literal or JSON-safe string construction so the wrapper parses before execution.
- [2026-07-15] Build-mode types: Source code using `import.meta.env` requires the `vite/client` type reference; when replacing a configuration field, search and migrate every static and context consumer before running the full typecheck.
- [2026-07-18] Rebase conflict staging: Never `git add -A && git rebase --continue` in one chained command — a grep for conflict markers that "succeeds" (finds markers) does not stop the chain, and `git add` marks files resolved even when they still contain `<<<<<<<` markers, committing them into history. Verify marker-free (`grep -rL` or check exit code explicitly) as a separate step, and stage only the files you actually resolved by name.
- [2026-07-18] Rebase test failures: When a test fails after rebase, bisect the cause before fixing: run it on the new base (worktree + symlinked node_modules) and diff the involved sources old-tip↔new-tip and base↔branch. A branch that intentionally changed behavior (e.g. CX2 exporter emitting size/position as stringified defaults, not mappings) can conflict semantically with a base-side test that asserts the old behavior — the fix is updating the test to the branch's intent, not reverting the behavior.
- [2026-07-18] Desktop CX2 compatibility: A CX2 that Cytoscape Desktop *imports* without error can still *render* wrong — the "?" custom-graphics placeholder is a render-time image-load failure invisible to the `POST /v1/networks` response. Verify with the round-trip harness in `scripts/desktop-roundtrip/`, then eyeball the network in Desktop. Key gotchas: SVG needs the `SVGCustomGraphics` factory class (not the bitmap `URLImageCustomGraphics`); `data:` URIs / inline SVG do NOT render in Desktop (no Java `data:` URL handler) — warn and prefer hosted http(s) URLs; `NODE_CUSTOMGRAPHICS_SIZE` must be a stringified Double ("50.0") or Desktop throws ClassCastException.
- [2026-07-18] Desktop custom-graphic images do NOT round-trip via CX2: Cytoscape Desktop loads image bytes from its session CustomGraphicsManager pool, not from the network file. A CX2 import (Web "Open in Desktop", File>Import, or REST /v1/networks) keeps only the reference (class,id,name,tag) and never fetches properties.url — for ANY scheme (http/https/data/file). Result: image custom graphics show "?" in a fresh Desktop session regardless of URL. Proven by rendering imported views via CyREST `GET /v1/networks/{suid}/views/{viewSuid}.png` and reading the PNG (a reliable way to visually verify Desktop rendering from an agent). This is why STRING needs stringApp installed — the app pools images via Java. Do not chase this as a CW export-format bug; warn the user instead.
