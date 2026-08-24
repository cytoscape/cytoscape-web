# Lessons Learned — Standing Rules

> Read this at the start of every session: short rules that change how you work
> in this repo. It is deliberately kept small.
>
> The long-form investigation notes — what was measured, what was tried and
> rejected, why a fix looks the way it does — live in `lessons-archive.md`.
> Grep that file when you are about to work in the area it covers; do not read
> it start to finish.
>
> Format: `- [YYYY-MM-DD] <category>: <lesson>`. New short rules go here; new
> narrative findings go in the archive.

## Coding Patterns

- [2026-03-04] enableMapSet: Any new standalone test entry point MUST call `enableMapSet()` before Immer can handle Map/Set — omitting it causes cryptic test failures.
- [2026-03-04] App API: Core functions in `src/app-api/core/` must have zero React imports. Use `useXxxStore.getState()` instead of hooks.
- [2026-03-04] App API: All public API functions must return `ApiResult<T>` — never throw across the API boundary.
- [2026-03-04] Serialization: Before saving to IndexedDB, proxy objects must be converted with `toPlainObject()`. Map-based data needs specialized serializers.
- [2026-07-25] Dexie transaction scope: Inside `db.transaction('rw', db.someTable, ...)`, calling a helper that reads a DIFFERENT table throws `NotFoundError`. Keep a raw in-scope reader separate from the public getter that joins across tables.
- [2026-07-25] Per-tab state: Keep per-tab state OUT of shared IndexedDB rows rather than filtering it on read. Masking on hydration is not enough — the next local mutation writes the tab's private value back into the shared row, and a newly opened tab inherits whatever tab wrote last.
- [2026-07-25] PanelState has four values (OPEN, CLOSED, HIDDEN, MINIMIZED). Validating against only OPEN/CLOSED silently resets hidden or minimized panels.

## Build & CI

- [2026-03-04] Import sorting: Import sorting is no longer lint-enforced after the oxlint migration; keep imports sorted by convention.
- [2026-03-04] No `console.log`: Production builds strip direct `console.*()` calls through Vite's Oxc minifier. Use the `debug` logger from `src/debug.ts`.

## Testing

- [2026-08-03] jsdom drops CSS values it cannot parse: `getComputedStyle` returns `auto` for `width: min(500px, calc(100% - 32px))` while `calc(100% - 32px)` resolves fine. Layout-assertion unit tests must stick to values jsdom's cssstyle understands, or assert in Playwright instead.

## Agent Workflow

- [2026-07-28] Documentation patching: Treat truncated combined command output as diagnostic only; re-read the exact target range before constructing a multi-hunk `apply_patch`, because apparent duplicate lines may be output artifacts rather than file content.
- [2026-07-20] Commit cadence: Commit each completed, verified round of work immediately with a detailed message — don't batch rounds or wait to be asked (standing instruction from Max).
- [2026-03-04] Memory consolidation: AGENTS.md is the single source of truth for project context; CLAUDE.md includes it with `@AGENTS.md`. `.serena/memories/` should only contain lessons (this file) and task checklists — not duplicated agent context.
- [2026-07-15] Git sandbox: Branch merges may require elevated permission because the workspace sandbox can read `.git` but cannot create `.git/ORIG_HEAD.lock`.
- [2026-07-15] Commit convention: When Codex makes a commit, prefix the commit message with `Codex: `.
- [2026-07-15] Vitest targeting: Passing a source file such as `src/features/SyncTabs.tsx` to `vitest run` exits 1 when no matching test file exists; locate a test first or run the full unit suite.
- [2026-07-15] Shell quoting: Put ripgrep patterns containing Markdown backticks in single quotes (or split them into fixed-string searches); unescaped backticks inside a double-quoted shell command trigger command substitution or an unmatched-quote failure.
- [2026-07-15] Tool wrapper quoting: JavaScript passed to the orchestration wrapper must safely encode shell commands that contain quote characters; prefer a template literal or JSON-safe string construction so the wrapper parses before execution.
- [2026-07-25] Vitest timeouts: A dynamic `await import()` inside a test body charges module load time to the 1s per-test timeout — it passes alone and fails under full-suite load. Use static imports; `vi.mock` is hoisted, so they still get mocked.
- [2026-07-15] Build-mode types: Source code using `import.meta.env` requires the `vite/client` type reference; when replacing a configuration field, search and migrate every static and context consumer before running the full typecheck.
- [2026-07-19] VisualStyleStore add(): The CyjsRenderer calls `add(id, vs)` after every render pass — any state keyed alongside `visualStyles` must be PRESERVED when add() is called without the optional styleSet param, or it gets silently reset on each render.
- [2026-07-19] Store→DB async writes: Never pass Immer draft subtrees to async DB functions inside a producer — the proxies are revoked when the producer returns. Snapshot with `current(state)` first (see VisualStyleStore.add).
- [2026-07-19] Mocked store modules: Tests that `vi.mock` a store module (e.g. exportApi.test.ts mocking VisualStyleStore) must be updated when the module gains new named exports, or importers crash with confusing "undefined is not iterable" errors.
- [2026-07-19] Dexie schema: Row-shape changes need NO version bump/migration (normalize legacy rows on read); adding an object store only needs a version bump — Dexie ≥3 auto-diffs the declared schema. The migrations array machinery in migrations.ts is untested — avoid relying on it.
