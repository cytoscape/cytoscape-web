# Lessons Learned

> Shared across all AI agents. Append new entries after corrections or unexpected failures.
> Format: `- [YYYY-MM-DD] <category>: <lesson>`

## Coding Patterns

- [2026-03-04] enableMapSet: Any new standalone test entry point MUST call `enableMapSet()` before Immer can handle Map/Set — omitting it causes cryptic test failures.
- [2026-03-04] App API: Core functions in `src/app-api/core/` must have zero React imports. Use `useXxxStore.getState()` instead of hooks.
- [2026-03-04] App API: All public API functions must return `ApiResult<T>` — never throw across the API boundary.
- [2026-03-04] Serialization: Before saving to IndexedDB, proxy objects must be converted with `toPlainObject()`. Map-based data needs specialized serializers.
- [2026-07-25] dexie-observable: `db.on('changes')` fires in EVERY tab for EVERY change, own writes included — it replays `_changes` rows above each tab's revision. Never relay changes over a BroadcastChannel on top of it: peers re-broadcast and the originating tab hydrates its own write. BroadcastChannel also has no replay, so a frozen/bfcached tab misses messages the `_changes` log would have delivered.
- [2026-07-25] Cross-tab origin: To tell your own writes from a peer's, stamp `trans.source` by overriding Dexie's `_createTransaction` (see `stampTransactionSource` in `src/data/db/index.ts`). It is a private API, so `db.test.ts` asserts `_changes` rows carry the tab id — without that guard a Dexie upgrade would silently reintroduce an echo loop.
- [2026-07-25] Write suppression: NEVER hold a global "skip persistence" flag across an `await`. Cross-tab hydration used to, and every user edit made during its IndexedDB reads was applied to Zustand but silently never persisted (`persistNetworkSlices` only diffs before/after of the current `set`, so nothing recovered it). Split async fetch from a synchronous apply phase instead.
- [2026-07-25] Dexie transaction scope: Inside `db.transaction('rw', db.someTable, ...)`, calling a helper that reads a DIFFERENT table throws `NotFoundError`. Keep a raw in-scope reader separate from the public getter that joins across tables.
- [2026-07-25] Per-tab state: Keep per-tab state OUT of shared IndexedDB rows rather than filtering it on read. Masking on hydration is not enough — the next local mutation writes the tab's private value back into the shared row, and a newly opened tab inherits whatever tab wrote last.
- [2026-07-25] PanelState has four values (OPEN, CLOSED, HIDDEN, MINIMIZED). Validating against only OPEN/CLOSED silently resets hidden or minimized panels.

## Build & CI

- [2026-03-04] Import sorting: Import sorting is no longer lint-enforced after the oxlint migration; keep imports sorted by convention.
- [2026-03-04] No `console.log`: Production builds strip direct `console.*()` calls through Vite's Oxc minifier. Use the `debug` logger from `src/debug.ts`.

## Agent Workflow

- [2026-07-20] Commit cadence: Commit each completed, verified round of work immediately with a detailed message — don't batch rounds or wait to be asked (standing instruction from Max).

- [2026-03-04] Memory consolidation: AGENTS.md is the single source of truth for project context; CLAUDE.md includes it with `@AGENTS.md`. `.serena/memories/` should only contain lessons (this file) and task checklists — not duplicated agent context.
- [2026-07-15] Git sandbox: Branch merges may require elevated permission because the workspace sandbox can read `.git` but cannot create `.git/ORIG_HEAD.lock`.
- [2026-07-15] Commit convention: When Codex makes a commit, prefix the commit message with `Codex: `.
- [2026-07-15] Vitest targeting: Passing a source file such as `src/features/SyncTabs.tsx` to `vitest run` exits 1 when no matching test file exists; locate a test first or run the full unit suite.
- [2026-07-15] Shell quoting: Put ripgrep patterns containing Markdown backticks in single quotes (or split them into fixed-string searches); unescaped backticks inside a double-quoted shell command trigger command substitution or an unmatched-quote failure.
- [2026-07-15] Tool wrapper quoting: JavaScript passed to the orchestration wrapper must safely encode shell commands that contain quote characters; prefer a template literal or JSON-safe string construction so the wrapper parses before execution.
- [2026-07-25] Vitest timeouts: A dynamic `await import()` inside a test body charges module load time to the 1s per-test timeout — it passes alone and fails under full-suite load. Use static imports; `vi.mock` is hoisted, so they still get mocked.
- [2026-07-25] E2E for cross-tab: Two Playwright pages from the SAME `context` share the origin's IndexedDB, which is what makes cross-tab behavior testable (`test/playwright/cross-tab-sync.spec.ts`). `ApiResult` returns `.data`, not `.value`, and `window.debug.db` only exists when the debug namespace is enabled — asserting on it makes a test vacuously pass.
- [2026-07-15] Build-mode types: Source code using `import.meta.env` requires the `vite/client` type reference; when replacing a configuration field, search and migrate every static and context consumer before running the full typecheck.
