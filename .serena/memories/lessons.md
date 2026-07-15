# Lessons Learned

> Shared across all AI agents. Append new entries after corrections or unexpected failures.
> Format: `- [YYYY-MM-DD] <category>: <lesson>`

## Coding Patterns

- [2026-03-04] enableMapSet: Any new standalone test entry point MUST call `enableMapSet()` before Immer can handle Map/Set — omitting it causes cryptic test failures.
- [2026-03-04] App API: Core functions in `src/app-api/core/` must have zero React imports. Use `useXxxStore.getState()` instead of hooks.
- [2026-03-04] App API: All public API functions must return `ApiResult<T>` — never throw across the API boundary.
- [2026-03-04] Serialization: Before saving to IndexedDB, proxy objects must be converted with `toPlainObject()`. Map-based data needs specialized serializers.

## Build & CI

- [2026-03-04] Import sorting: `eslint-plugin-simple-import-sort` is at error level — builds will fail if imports are unsorted.
- [2026-03-04] No `console.log`: Production builds strip all `console.log` via Terser. Use the `debug` logger from `src/debug.ts`.

## Agent Workflow

- [2026-03-04] Memory consolidation: CLAUDE.md is the single source of truth for project context. `.serena/memories/` should only contain lessons (this file) and task checklists — NOT duplicates of CLAUDE.md content.
- [2026-07-15] Git sandbox: Branch merges may require elevated permission because the workspace sandbox can read `.git` but cannot create `.git/ORIG_HEAD.lock`.
- [2026-07-15] Commit convention: When Codex makes a commit, prefix the commit message with `Codex: `.
- [2026-07-15] Vitest targeting: Passing a source file such as `src/features/SyncTabs.tsx` to `vitest run` exits 1 when no matching test file exists; locate a test first or run the full unit suite.
