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

## Testing

- [2026-07-27] E2E unsaved-state race: `WorkspaceEditor.tsx` clears `networkModified` when a network's initial auto-layout completes (a seeded network has no stored layout, so this always fires). A Playwright test that edits a freshly seeded network and asserts its unsaved state must wait for that one-shot reset first — the summary's `hasLayout` flipping to `true` in IndexedDB is its observable side. Symptom otherwise: the first dirty-state assertion passes, a later one polls a clean row until it times out.
- [2026-07-28] E2E serves a production build on 5500: `playwright.config.ts` runs `npm run build && vite preview --port 5500`, not the dev server, because 5 parallel workers cold-booting the unbundled dev-server module graph pushed the first wave of tests past their timeouts (symptom: `[data-testid="app-shell"]` "element(s) not found", with the failure screenshot showing a perfectly booted app). Port 5500 is required — Keycloak's client registration expects that origin — and Playwright checks the port _before_ spawning `webServer.command`, so nothing inside that command can free it. Agents running e2e must check 5500 first and ask the user before stopping a dev server they did not start; `E2E_DEV=1` reuses it instead.
- [2026-07-28] Don't measure e2e on a different port: verifying on 5501 to avoid touching the user's dev server silently handicapped every page load — that origin is not registered with Keycloak, so silent SSO fails and boot waits out the 4s watchdog in `startAuthentication.ts`. Measurements taken off 5500 are not comparable.
- [2026-07-29] E2E scope for agents (standing instruction from Dylan): running the **whole** local e2e suite is greatly discouraged — it is flaky under worker contention and slow, so CI owns it, and `.claude/settings.json` denies `npm test`, `npm run test:e2e`, `npm run test:e2e:chromium`, and bare `npx playwright test`. Running the one or few specs that cover the change in hand (`npx playwright test <spec> --project=chromium`) is acceptable.
- [2026-07-29] Cookie consent blocks table-browser pointer events: the `[data-testid="cookie-consent"]` banner overlays the bottom of the window, which is where the table browser sits, so `hover()`/`click()` inside the grid fails with "intercepts pointer events". Click its Accept button first. Specs that only touch the toolbar or tabs are unaffected, which is why this had not surfaced before.
- [2026-07-27] AppManager toggle detaching: `app-toggle-*` (a MUI `Switch`) is rendered only for the `enable`/`disable` actions and is swapped for a `CircularProgress` while `loadState === 'loading'`. So "element was detached from the DOM, retrying" in the remote-app specs means activation started and never completed (often a stale fixture remote reused on :4191 — `reuseExistingServer: true`), not a missing toggle.

## Agent Workflow

- [2026-07-28] Documentation patching: Treat truncated combined command output as diagnostic only; re-read the exact target range before constructing a multi-hunk `apply_patch`, because apparent duplicate lines may be output artifacts rather than file content.

- [2026-07-20] Commit cadence: Commit each completed, verified round of work immediately with a detailed message — don't batch rounds or wait to be asked (standing instruction from Max).

- [2026-03-04] Memory consolidation: AGENTS.md is the single source of truth for project context; CLAUDE.md includes it with `@AGENTS.md`. `.serena/memories/` should only contain lessons (this file) and task checklists — not duplicated agent context.
- [2026-07-15] Git sandbox: Branch merges may require elevated permission because the workspace sandbox can read `.git` but cannot create `.git/ORIG_HEAD.lock`.
- [2026-07-15] Commit convention: When Codex makes a commit, prefix the commit message with `Codex: `.
- [2026-07-15] Vitest targeting: Passing a source file such as `src/features/SyncTabs.tsx` to `vitest run` exits 1 when no matching test file exists; locate a test first or run the full unit suite.
- [2026-07-15] Shell quoting: Put ripgrep patterns containing Markdown backticks in single quotes (or split them into fixed-string searches); unescaped backticks inside a double-quoted shell command trigger command substitution or an unmatched-quote failure.
- [2026-07-15] Tool wrapper quoting: JavaScript passed to the orchestration wrapper must safely encode shell commands that contain quote characters; prefer a template literal or JSON-safe string construction so the wrapper parses before execution.
- [2026-07-15] Build-mode types: Source code using `import.meta.env` requires the `vite/client` type reference; when replacing a configuration field, search and migrate every static and context consumer before running the full typecheck.
- [2026-07-18] Rebase conflict staging: Never `git add -A && git rebase --continue` in one chained command — a grep for conflict markers that "succeeds" (finds markers) does not stop the chain, and `git add` marks files resolved even when they still contain `<<<<<<<` markers, committing them into history. Verify marker-free (`grep -rL` or check exit code explicitly) as a separate step, and stage only the files you actually resolved by name.
- [2026-07-18] Rebase test failures: When a test fails after rebase, bisect the cause before fixing: run it on the new base (worktree + symlinked node_modules) and diff the involved sources old-tip↔new-tip and base↔branch. A branch that intentionally changed behavior (e.g. CX2 exporter emitting size/position as stringified defaults, not mappings) can conflict semantically with a base-side test that asserts the old behavior — the fix is updating the test to the branch's intent, not reverting the behavior.
