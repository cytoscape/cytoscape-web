# AGENTS.md

> Source of truth for agent context and behavior in this repository.

## 1. AI Agent Workflow & Rules

**Workflow Orchestration:**

- **Plan First:** Enter plan mode for any non-trivial task (3+ steps or architectural decisions). Break work into checkable items and track progress via the built-in todo list tool.
- **Context Ingestion:** Before planning, actively review the relevant specs in `docs/specifications/` and relevant ADRs. See [Section 6](#6-specification-references) for the full list.
- **Halt and Re-plan:** If something goes wrong, STOP and re-plan immediately rather than continuing blindly.
- **Capture Lessons:** After any user corrections or unexpected failures, record what you learned so it is not repeated. Short standing rules go in `.serena/memories/lessons.md` — read that file at the start of each session; it is kept small on purpose. Long-form findings (what was measured, what was tried and rejected) go in `.serena/memories/lessons-archive.md`, which you grep by keyword when working in the area it covers rather than reading end to end. Both are git-tracked and shared across all agents.

**Autonomous Bug Fixing & Verification:**

- **Test-Driven Fixes:** Before writing implementation code, write a failing regression test. Follow `vitest-setup.ts` conventions (including `enableMapSet()`) and test stores via `@testing-library/react` hooks. Prove it fails, apply the fix, then prove it passes.
- **Verification Before Done:** NEVER mark a task complete without proving it works. Run `npm run test:checks:quiet` (lint ∥ unit), plus the one or few e2e specs covering the change, and diff the behavior. Always use the `:quiet` variants — see [Section 5](#5-development-operations).
- **Fix Root Causes:** Fix root causes, not symptoms. Never apply band-aid fixes. Fix failing CI tests proactively.

**Safety:**

- **Logging Rule:** ALWAYS use the structured `debug` logger (`logStore`, `logUi`, etc.) defined in `src/debug.ts`. NEVER use `console.log`.
- **Destructive Operations:** NEVER clear the `cyweb-db` IndexedDB, drop databases, or execute destructive commands (like `--force` push, `rm -rf`) without explicit user confirmation.
- **Dependency Changes:** ALWAYS ask for permission before modifying `package.json` or other dependency manifests.

---

## 2. Architecture Overview

### Three-Layer Architecture

Cytoscape Web is a React-based network visualization and analysis app with a strict three-layer separation:

```text
1. Models    (src/models/)                → Pure TypeScript interfaces + implementation functions
2. Stores    (src/data/hooks/stores/)     → Zustand stores with Immer, wrapping model operations
3. Features  (src/features/)              → React components consuming stores via hooks
```

**Rules:** Models must NOT import from React or Zustand. Stores must NOT import React components. Features consume stores through hooks.

**Non-negotiables that bite if you miss them:**

- Model implementations in `impl/` are pure TypeScript — no React, no Zustand. Interfaces use `readonly` properties; `IdType = string` (`src/models/IdType.ts`) identifies nodes, edges and networks alike.
- All stores use Immer; persisted stores with subscriptions use `create(subscribeWithSelector(immer(persist(...))))`.
- `enableMapSet()` must run before Immer touches a Map or Set — done in `src/boot/bootstrap.tsx` and `vitest-setup.ts`. A new standalone test entry point must call it too.
- Before saving to IndexedDB, convert proxies with `toPlainObject()` from `src/data/db/serialization/`; Map-based data has dedicated serializers (`serializeTable`, `serializeVisualStyle`, `serializeNetworkView`).
- Inside store actions, reach other stores with `useXxxStore.getState()`, never hooks. Hooks are for components.
- All external CX2 data must pass `validateCX2()` first (see `docs/specifications/EXTERNAL_INPUT_VALIDATION_POLICY.md`).

**Reference:** naming conventions, the directory map, the feature-module and
model patterns, the full store middleware stack, and the routing table live in
[`docs/agents/architecture.md`](docs/agents/architecture.md). Read the part you
need when you get there — do not read it all up front.

## 3. Code Style & Conventions

**Formatting (enforced by Prettier):**

- No semicolons
- Single quotes
- Trailing commas (all positions)
- 2-space indentation, 80-char line width

**Linting (enforced by oxlint — config in `.oxlintrc.json`):**

- TypeScript compiles with `strict: true`; narrow unknown errors and external data instead of weakening compiler options.
- `correctness` category is error level; `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` are error level (the repo is at zero exhaustive-deps findings — keep it there; genuinely intentional dep omissions get `// eslint-disable-next-line react-hooks/exhaustive-deps -- <reason>` placed immediately before the dependency-array closing line)
- `typescript/no-explicit-any` is OFF — `any` is permitted
- Import sorting is no longer lint-enforced (the ESLint `simple-import-sort` rule had no oxlint equivalent); keep imports sorted by convention
- Functional components only — no class components
- New JSX transform (`react-jsx`) — do NOT add `import React from 'react'` in component files
- Use the `@/` alias for imports rooted at `src/`; relative imports remain appropriate for nearby files in the same feature or model.

**Dialogs:**
Modals close through their own buttons only — backdrop click and Esc are inert everywhere. Never import `Dialog` from `@mui/material`; render through `CyDialog` (`src/components/CyDialog.tsx`), which lint enforces. **Every dialog must have a visible Cancel or Close button — it is the only exit.** Modal form popovers use `disableEscapeKeyDown={true}` + `hideBackdrop={true}` instead. See `docs/specifications/DIALOG_DISMISS_POLICY.md`, including why `stopPropagation()` on a `<Dialog>` does not block either path.

**Logging:**
Use the structured `debug` logger from `src/debug.ts`, not `console.log`. Production builds use Vite's Oxc minifier to strip direct `console.*()` calls.
Available loggers (each has `.info`, `.warn`, `.error`): `logDb`, `logStore`, `logApi`, `logApp`, `logUi`, `logStartup`, `logPerformance`, `logHistory`, `logModel`.
See `docs/specifications/DEBUG_GUIDE.MD` for the full policy.

---

## 4. App API (Module Federation)

The `src/app-api/` directory is the **sole public API surface** for external apps consuming Cytoscape Web via Module Federation or `window.CyWebApi`.

**Read `src/app-api/AGENTS.md` before modifying any file in this directory.** It documents the two-layer pattern, error handling conventions, and event bus architecture.

**Key principles:**

- All API functions return `ApiResult<T>` (discriminated union with `success` flag) — never throw across the API boundary.
- Core logic in `src/app-api/core/` is framework-agnostic (no React imports).
- React hooks in `src/app-api/use*.ts` are thin wrappers around core functions.
- `window.CyWebApi` provides the same API for non-React consumers (browser extensions, LLM agent bridges).
- Types are published as the `@cytoscape-web/api-types` package (in `packages/api-types/`). Build with `npm run build:api-types`.

**Module Federation exposes** are defined in `src/app-api/federation/federationExposes.ts` and consumed by `vite.config.ts`.
Plugins import from the `cyweb/` prefix. Check `FEDERATION_EXPOSES` directly for the current public modules.

---

## 5. Development Operations

### Prerequisites

**Node 24.** `package.json` sets `engines.node >= 24.0.0` and `.npmrc` sets
`engine-strict=true`, so `npm install` hard-fails on anything older, and Vite 8
needs 22.12+ regardless. On a machine whose default `node` is older, the
failures are cryptic — `vitest` dies loading its config with `ERR_REQUIRE_ESM`
from `std-env`, and Playwright's build dies the same way. **Check `node -v`
against `.nvmrc` before diagnosing any toolchain error**; `nvm use` (or
`mise install`) fixes it.

### Commands

**Building & Development:**

- `npm install` - Install dependencies
- `npm run dev` - Start dev server (opens browser at localhost:5500)
- `npm run build` - Build for production
- `npm run build:analyze` - Build with a Rollup visualizer report
- `npm run build:api-types` - Build the `@cytoscape-web/api-types` package
- `npm run clean` - Remove dist folder

**Testing:**

- `npm test` - Run all checks (lint ∥ unit in parallel, then Chromium e2e)
- `npm run test:checks` - Run lint and unit tests in parallel (no e2e)
- `npm run test:unit` - Run Vitest unit tests
- `npm run test:e2e` - Run Playwright end-to-end tests (all browsers)
- `npm run test:e2e:chromium` - Run Playwright end-to-end tests (Chromium only; used by `npm test`)

Most of the time you want **one file, not the suite** — the full unit run is
~70s, a single spec is a few seconds:

```bash
npx vitest run src/models/CxModel/impl/converter.test.ts   # one file
npx vitest run elementApi                                  # substring match
```

(Vitest takes paths/patterns as positional arguments. `--testPathPattern` is
Jest syntax and errors out here.)

Each test script has a `:quiet` variant (`test:quiet`, `test:unit:quiet`,
`test:coverage:quiet`, `test:e2e:quiet`, `test:e2e:chromium:quiet`) that prints
failures and a summary only — no per-test output, no test stdio, and (via
`CYWEB_TEST_QUIET`) no `debug`-logger noise. Vitest uses its built-in `minimal`
reporter; Playwright uses `test/playwright/quiet-reporter.ts`. **Agents must
ALWAYS run the quiet variants** to avoid polluting their context with verbose
passing-test output (e.g. `npm run test:unit:quiet`, or
`npm run e2e:spec -- <spec-name>` for a targeted e2e spec).

**Agents must not run the whole e2e suite locally.** Full-suite runs are flaky under
worker contention and take minutes to tell you little, so `.claude/settings.json`
denies `npm test`, `npm run test:e2e`, `npm run test:e2e:chromium`, their `:quiet`
variants, the `e2e:run` helper scripts, and a bare `npx playwright test`, and
`scripts/run-playwright.mjs` refuses any local run that names no spec — a guard
that binds Codex and humans too, overridable with `CYWEB_FULL_E2E=1`. CI owns
the full suite. Running the **one or few specs that cover the change in hand**
is fine and encouraged:

```bash
npm run e2e:spec -- table-browser        # quiet, chromium, builds the fixture remote
```

Keep the scope to the change; `npm run test:checks:quiet` (lint and the unit
suite in parallel) remains the local gate for everything else.

**Port 5500 must be free before an e2e run.** Playwright builds the app and serves
it with `vite preview` on 5500 — the port Keycloak's client registration expects —
and checks the port before starting, so a dev server there fails the run with
"already used". **Agents:** check for a listener on 5500 first and, if it is a dev
server the user started, ask before stopping it; never kill it silently. Use
`E2E_DEV=1` to run against an existing dev server instead, at the cost of a
flakier suite. See `test/playwright/README.md`.

**Code Quality:**

- `npm run lint` - Lint TypeScript/JavaScript files in src/
- `npm run lint:fix` - Auto-fix lint errors
- `npm run format` - Format code with Prettier

### Testing Details

**Unit Tests (Vitest):**

- Environment: jsdom by default. **Test files that never touch the DOM must start
  with `// @vitest-environment node`** — jsdom setup costs ~1s per file, node is
  near-free, and ~150 files already opt in. If a node-tagged file fails on a
  missing browser global (`window`, `document`, `localStorage`, or an import like
  `keycloak-js`/`dexie-observable` that needs one), remove the pragma.
- Setup: `vitest-setup.ts` loads `fake-indexeddb/auto`, calls `enableMapSet()`, and sets a 1-second test timeout
- **Tests are co-located with source files**, not in a separate directory
- Convention: `.test.ts` for utilities/hooks/APIs; `.spec.ts` for stores and feature modules
- Store tests: `renderHook(() => useXxxStore())` + `act()` from `@testing-library/react`
- Common mocks: `vi.mock('../../db', ...)` for DB operations, `vi.mock('./WorkspaceStore', ...)` for `currentNetworkId`

**E2E Tests (Playwright):**

- Test directory: `test/playwright/`
- Browsers: Chromium, Firefox, WebKit
- Base URL: `http://localhost:5500` (auto-starts dev server)
- Element selection: `data-testid` attributes
- Artifacts: trace on first retry, video on failure, screenshot on failure
- Test workflow templates in `docs/prompts/`: planner → generator → healer

**Test Fixtures:**

- Location: `test/fixtures/` (CX2, HCX, SIF, table files, DB snapshots)
- Naming convention: `<characteristic>.<valid|invalid>.<extension>`
- Generation scripts: `scripts/generate-test-fixtures/`

### Build, Configuration & Scripts

The Vite 8 / Module Federation build, the runtime configuration files
(`src/assets/config.json`, `apps.json`, `src/debug.ts`, `src/boot/`), and the
`scripts/` directory are documented in
[`docs/agents/environment.md`](docs/agents/environment.md).

## 6. Specification References

Read these before working in related areas:

- `docs/specifications/STARTUP_SPECIFICATION.md` — boot phase contract, failure policy, timing milestones
- `docs/specifications/ROUTING_SPECIFICATION.md` — URL routing rules, navigation patterns, search parameter handling
- `docs/specifications/MULTIPLE_VISUAL_STYLES.md` — Named visual style sets per network, `cyWebVisualStyles` CX2 aspect, style library
- `docs/specifications/EXTERNAL_INPUT_VALIDATION_POLICY.md` — CX2 validation requirements for external data
- `docs/specifications/DIALOG_DISMISS_POLICY.md` — button-only dialog dismissal, the `CyDialog` wrapper, modal form popovers
- `docs/specifications/DEBUG_GUIDE.MD` — Structured logging policy and debug namespace usage
- `docs/specifications/FEATURE_MODULE_CREATION_PATTERN.md` — How to create new feature modules
- `docs/specifications/MODEL_CREATION_PATTERN.md` — How to create new model domains
- `docs/specifications/STORE_CREATION_PATTERN.md` — How to create new Zustand stores
- `docs/prompts/playwright-test-planner.md` — E2E test planning workflow
- `docs/prompts/playwright-test-generator.md` — E2E test generation conventions
- `docs/prompts/playwright-test-healer.md` — Fixing broken E2E tests
- `docs/prompts/code-quality-for-testing-behaviour.md` — Adding `data-testid`, documentation, linting
- `docs/prompts/code-quality-testing-refactoring.md` — Extracting hooks, adding unit tests
- `src/boot/boot_docs/boot.md` — startup directory map and design reasoning
- `src/app-api/AGENTS.md` — App API architecture, two-layer pattern, event bus
- `docs/agents/architecture.md` — naming conventions, directory map, feature/model/store patterns, routing table
- `docs/agents/environment.md` — build system, runtime config files, repo scripts

---

## 7. Special Considerations

- **`zod`** — Available as a dependency for runtime validation.
- **NDEx Dev Server** — `config.json` points to `dev1.ndexbio.org` by default.
- **DB Migrations** — Schema changes go in `src/data/db/migrations.ts`. DB name and current version are defined in `src/data/db/index.ts`.
- **Blank Workspace?** — Clear IndexedDB (`cyweb-db`) to reset. Browser DevTools → Application → IndexedDB.
- **Keycloak Auth** — SSO authentication with `silent-check-sso.html` for silent token refresh.
- **Branch Workflow** — `development` (default) → `master` (release) → GitHub release → Zenodo DOI.
