# DX Audit: Cytoscape Web

> Audit date: 2026-07-13 · branch `wincompat` @ 186d52cf
>
> **Method:** 8 parallel auditors (build speed, dev loop, testing, lint/typecheck, CI/CD, docs/onboarding, automation, editor ergonomics), with every finding independently re-verified against the actual repo by a skeptical verifier agent — 60 agents total. Timing claims were reproduced empirically by the verifiers. 51 findings confirmed, 1 rejected.
>
> This file is the synthesized, deduplicated report. Full per-finding detail (evidence with file:line citations, verifier corrections): [findings/FINDINGS.md](./findings/FINDINGS.md). Raw structured data: [findings/dx-findings.json](./findings/dx-findings.json).
>
> **Status update (2026-07-15):** items 1, 3, 4, and 5 in the suggested order have been addressed on this branch. The documentation correction made `AGENTS.md` authoritative, reduced `CLAUDE.md` to `@AGENTS.md`, removed the obsolete sync scripts, and updated the remaining Vite/Vitest guidance. The `tsconfig.eslint.json` subfinding was already resolved because that deleted config no longer exists. The findings are preserved below as originally written; cited line numbers predate these changes.

## Fix these first — verified defects, not just improvements

**1. A fifth of the unit suite is silently not running.** `vitest.config.ts:14` includes only `**/*.test.{ts,tsx}`, but 34 files use `.spec.ts` — every Zustand store test and the whole MergeNetworks suite, 364 tests total. Jest's default matched both suffixes; the Vitest migration dropped them. Running them with a corrected include confirmed: **all 364 pass in ~5s**, so the fix is one line — `include: ['src/**/*.{test,spec}.{ts,tsx}']` (the `src/` scope matters: Playwright's specs in `test/playwright/` would crash under Vitest). Until this lands, a store regression merges cleanly. *(Findings #10, #23, #31)*

**2. The core docs teach a build system that no longer exists.** CLAUDE.md/AGENTS.md, README, `docs/specifications/STORE_CREATION_PATTERN.md`, and `src/app-api/CLAUDE.md` still reference `webpack.config.js`, `jest-setup.ts`, `jest.mock`, Terser, and a "100 second test timeout" (`vitest-setup.ts` actually sets **1s**). Since CLAUDE.md explicitly drives agents, this actively causes wrong behavior: agents look for nonexistent files, write `jest.mock`-style tests, and expect a 100s timeout. Same story in `tsconfig.eslint.json:3`, which still includes the deleted `jest-setup.ts` — so `vite.config.ts`/`vitest.config.ts`/`playwright.config.ts` throw false parse errors in-editor. One correction pass + `npm run sync:agents` fixes all of it. *(Findings #32, #34, #35, #45, #49)*

**3. Debug mode is committed on for production.** `src/assets/config.json` ships `"debug": true`, which sets `localStorage.debug='*'` and patches React with why-did-you-render for end users. Verification found it's worse than it looks: Oxc's `dropConsole` only strips direct `console.*()` calls, but the `debug` package logs through a saved `console.debug` reference — so production users likely see the log firehose too. Make debug a runtime toggle (`?debug` URL param / localStorage key, wdyr behind a dynamic import so it tree-shakes out of prod) and default the committed flag to false. *(Finding #8)*

## What could be faster

**Inner dev loop — the biggest win available.** Module Federation's 26 exposes (all stores/API hooks) plus the `window.CyWebApi` setup in `src/init.tsx` mean there is no accepting HMR boundary for roughly half the 692 source modules: any edit to models, stores, the db layer, or app-api triggers a **full reload** (Keycloak re-init, IndexedDB rehydration, lost UI state) instead of a sub-second hot update. Fix: gate `federation()` behind `command === 'build' || process.env.MF === '1'` (keep a `dev:mf` script for plugin work), and add an `import.meta.hot.accept('./app-api/core', ...)` boundary in `init.tsx`. Caveat the verifier caught: the Playwright webServer must run with `MF=1` since `remote-app-load.spec.ts` needs the federation runtime. *(Finding #7)*

**Lint/typecheck loop — ~20s → ~3s warm, all verified by re-measurement:**

- `eslint --cache --cache-location node_modules/.cache/eslint/` — 8s → **0.96s** warm. *(#16)*
- `"incremental": true, "tsBuildInfoFile": "node_modules/.cache/tsc/..."` — the explicit path matters because the default lands in `dist/` and gets wiped by every build. 11.3s → **~3.3s** warm. *(#18)*
- `lint` runs `tsc` then `eslint` serially via `run-s`; switch to `run-p --aggregate-output`. *(#17)*
- ESLint pays for type-aware parsing (`parserOptions.project`) but zero type-aware rules consume it — deleting it cut cold lint **11.7s → 5.3s** in verification. Either drop it or deliberately adopt `recommendedTypeChecked` so the cost buys something. *(#19)*
- `npm test` runs lint **last**, after unit + e2e — a typo fails after minutes instead of seconds. Reorder to `run-s lint test:unit test:e2e:chromium`. *(#14, #17)*

**CI — wall clock ~4m40s → ~2m50s (-38%) with two one-liners:**

- Delete `needs: unit-tests` from the Playwright matrix (ci.yml:66) — the single biggest latency cut; worst-case waste on a unit failure is ~7.5 runner-minutes. *(#11, #25)*
- Add `concurrency` with `cancel-in-progress` (conditional so master/development pushes always complete) — stops stale runs stacking on rapid pushes. *(#24, #41)*
- Larger change: all 6 jobs run independent full `npm ci` on a 2.3GB tree. Cache `node_modules` **and** `packages/*/node_modules` (workspaces!) keyed on lockfile + `.nvmrc`, with a separate key for the Playwright-container jobs. Also worth `paths-ignore` for docs-only changes. *(#3, #29, #30)*
- CI e2e currently runs against the dev server and uses `retries: 2` specifically to mask dep-optimization cold-start flakes. Running CI e2e against `vite build && vite preview` removes that flake class *and* tests the shipped bundle (needs a `preview.headers` CORS block for parity). *(#13)*

**Non-findings worth knowing:** the Rolldown build is ~7s and the e2e fixture rebuild is 75ms — the Vite migration already ate the big wins; none of the above requires re-architecting. Production sourcemaps now cost only ~0.5s, so `sourcemap: 'hidden'` is worth turning back on — the error-report feature currently can't symbolicate prod stacks. *(#5)*

## What could be easier

- **Pre-commit hooks (husky + lint-staged):** format/lint errors currently surface only in CI, a 15-minute round trip. Scope to `src/**` to match existing scripts, and add `--no-warn-ignored` for ESLint 9 + lint-staged. *(#20)*
- **Prettier has already drifted on 303 of 834 source files** — the declared style isn't real. One-time `npm run format` commit + `.git-blame-ignore-revs`, then a `format:check` in CI to hold the line. *(#21, #39)*
- **`@/` path alias:** 1,183 import lines are 3+ levels of `../`, 257 are 4+. One `paths` entry in tsconfig + one `alias` in vite.config (vitest inherits via `mergeConfig`); adopt in new code, no big-bang codemod required. *(#46)*
- **Committed `.vscode/`** (extensions.json, format-on-save + fix-on-save settings, launch.json for Chrome + Vitest debugging) — `.gitignore` already whitelists `!.vscode/extensions.json` but the file was never created. Plus `.editorconfig`/`.gitattributes` (`* text=auto eol=lf`) to make Windows clones byte-identical — directly relevant to the wincompat branch, and the last real gap behind README's "no Windows-specific setup" claim. *(#44, #47)*
- **`?resetDb` URL param** replacing the "clear IndexedDB via DevTools" ritual — handled in `init.tsx` before Keycloak init so it works even when the app can't boot. *(#9)*
- **One canonical build:** a bare `vite build` today produces a broken dist (missing `silent-check-sso.html` → Keycloak silent SSO fails, missing `apps.json`) that only fails once deployed. Move both into `public/`/the existing plugin (must remove its `apply: 'serve'` for the build hook to run) and collapse the four build script permutations. The 6GB `max-old-space-size` on `build:netlify` is vestigial webpack-era cargo, and `BUILD=netlify` has zero consumers. *(#0, #6)*

## What could be more automated

- **`verify:federation` exists, passes (36/36 checks), is documented as a CI gate in the migration design doc — and is wired to nothing.** One step in the existing build job protects the entire external-plugin API surface. Same for `packages/api-types`: nothing in CI builds or typechecks the package plugin authors compile against (a `prepare` script would also keep it fresh on install). *(#1, #2, #26, #36, #48)*
- **`check:agents` exists and is enforced nowhere** — one CI step guarantees CLAUDE.md/AGENTS.md never drift again. *(#27, #33, #40)*
- **No dependabot/renovate** despite visible multi-major-version drift (faker 7, openai 4, zod 3…). Note: `@playwright/test` is exact-pinned to the CI container tag, so add an ignore rule (or use Renovate to bump both together). *(#37)*
- **Release automation:** the Zenodo DOI currently lags releases by months (v1.0.8 missing entirely). A tag-triggered `release.yml` (version-tag drift check → build → verify:federation → auto-generated release notes) plus `CITATION.cff` makes tagging the whole ceremony. *(#38)*
- **Bundle-size feedback:** run the already-existing `ANALYZE=true` path in the CI build job, upload the treemap artifact, add a simple gzip budget gate. *(#4, #42)*
- **Coverage in CI** (v8 provider config + PR comment action) — currently measurable locally, visible never. And `coverage/` isn't gitignored. *(#12)*
- Smaller: `workflow_dispatch` so feature branches (like wincompat, which gets **no CI** until a PR opens) can run CI on demand *(#28)*; PR template/CODEOWNERS for `src/app-api/` and `src/data/db/` *(#43)*; npm scripts for the fixture generators — name the umbrella without a colon, `run-s fixtures:*` self-matches and loops forever *(#15)*.

## Longer-term

**TypeScript strict mode is closer than it looks.** Verified counts: 4 strict flags cost **1 fix**, `useUnknownInCatchVariables` costs 14 mechanical catch-block fixes, and the entire remainder (`strictFunctionTypes` → `strict: true`) is a bounded ~128-error work item. `packages/api-types` and `src/models/tsconfig.json` are already `strict: true` islands. One pre-existing blocker: `tsc --noEmit` already fails with 3 `import.meta.hot` errors in `init.tsx` (missing `vite/client` types) on this branch. *(#22)*

## Suggested order

|   | Change | Cost | Payoff |
|---|--------|------|--------|
| 1 | Vitest include pattern (`.spec` files) | 1 line | 364 dead tests resurrected |
| 2 | `debug: false` + runtime toggle | small | stops shipping debug mode to users |
| 3 | Drop `needs: unit-tests`, add `concurrency` | 3 lines | CI -38% |
| 4 | eslint `--cache` + tsc `incremental` + `run-p` + reorder `npm test` | script edits | warm lint 20s → ~3s |
| 5 | Docs correction pass + `check:agents` + `verify:federation` in CI | half a day | agents/contributors stop acting on fiction, permanently |
| 6 | Federation off in dev + HMR boundary | small, needs the Playwright caveat | full-reloads → sub-second HMR for half the codebase |
| 7 | Format reset + hooks, `.vscode/`, `.editorconfig`/`.gitattributes`, dependabot, release.yml | a day total | compounding hygiene |

One honest rejection from verification: "ignore `test/fixtures/remote-app/dist` in the dev watcher" — the premise was real but the claimed harm doesn't occur (Vite's defaults already cover it).

**Notes:** This audit changed no code. Several recommendations touch `package.json` or add dependencies (husky, lint-staged, size-limit), which per CLAUDE.md require explicit maintainer approval. Finding numbers (#N) refer to entries in [findings/FINDINGS.md](./findings/FINDINGS.md) and `findings/dx-findings.json`.
