# Vite Migration — Federation & Public API Test Hardening Plan

> Status: **Proposed** (plan only — no test code written yet)
> Branch: `feature/vite8`
> Author: agent-assisted analysis, 2026-06-16

## 1. Purpose

The `feature/vite8` branch replaces Webpack 5 + `ModuleFederationPlugin` with
Vite 8 (Rolldown) + `@module-federation/vite`. This plan adds automated tests
that **guarantee external "Cytoscape Web Apps" keep working** across the
bundler switch: both consumption paths must remain intact —

1. **Module Federation** — remote React apps importing `cyweb/ElementApi` etc.
2. **`window.CyWebApi`** — vanilla-JS / extension / LLM-bridge consumers.

The goal is a regression net that fails loudly if the migration (or any future
change) drops an exposed module, renames the container, breaks the
`remoteEntry.js` contract, loses a shared singleton, or fails to publish
`window.CyWebApi`.

## 2. The gap this plan closes

Every existing test that touches federation or the public API mocks out the
exact boundary the migration rewrote, so the suite is currently **blind** to
migration breakage:

| Existing test | What it mocks | Blind to |
| --- | --- | --- |
| `src/features/AppManager/loader/loadRemoteApp.test.ts` | `loadModule` fully mocked | the real MF runtime in `ExternalComponent.tsx` (rewritten in this branch) |
| `src/app-api/cywebapi-ready.test.ts` | hand-built mock object; real `CyWebApi` never imported | whether `init.tsx` actually assigns `window.CyWebApi` under Vite |
| `src/app-api/core/*.test.ts` | stores mocked; pure logic only | anything about bundling / exposes / federation |

None would fail if `vite build` silently shipped a broken or incomplete public
surface.

### Three contracts that must agree but nothing currently checks

The public surface is encoded in **three independent places** that must stay in
sync. There is no test asserting they do:

1. **`vite.config.ts`** — `federation({ exposes: { … } })` — the source of truth
   for what is shipped (currently 28 entries: API hooks, stores, task hooks,
   `ApiTypes`, `AppIdContext`, `EventBus`).
2. **`dist/` build output** — `dist/remoteEntry.js` (exports `init`, `get`) and
   the generated `dist/assets/virtual_mf-exposes…js` chunk, which literally
   lists each `"./ElementApi": async () => …` expose key.
3. **`packages/api-types/src/mf-declarations.d.ts`** — hand-maintained
   `declare module 'cyweb/*'` blocks that plugin authors compile against.

## 3. Tiered implementation plan

### Tier 1 — Config / contract tests (Jest, no browser, fast)

Runs inside the existing `npm run test:unit` suite. Catches dropped/renamed
exposes and api-types drift in milliseconds.

#### 1.0 Prerequisite refactor — extract the exposes map

`vite.config.ts` is awkward to import from Jest (ESM-only plugin imports,
top-level `defineConfig`). Extract the expose definition into a plain,
importable module so both the Vite config and the tests consume one source of
truth.

- **New file:** `src/app-api/federation/federationExposes.ts`

  ```ts
  // Single source of truth for Module Federation exposed modules.
  // Imported by vite.config.ts (build) and federationExposes.test.ts (contract).
  export const FEDERATION_NAME = 'cyweb'
  export const FEDERATION_FILENAME = 'remoteEntry.js'

  // key = the cyweb/<Name> import path (without the 'cyweb/' prefix);
  // value = the source module it maps to.
  export const FEDERATION_EXPOSES = {
    './ApiTypes': './src/app-api/types/index.ts',
    './ElementApi': './src/app-api/useElementApi.ts',
    // … all 28 entries, moved verbatim from vite.config.ts
  } as const

  export const FEDERATION_SHARED_SINGLETONS = [
    'react',
    'react-dom',
    '@mui/material',
  ] as const
  ```

- **Edit `vite.config.ts`:** import `FEDERATION_NAME`, `FEDERATION_FILENAME`,
  `FEDERATION_EXPOSES`, `FEDERATION_SHARED_SINGLETONS` and build the
  `federation({ … })` options from them (the `shared` map still attaches
  `requiredVersion` from `package.json`). No behavioral change to the build.

#### 1.1 Exposes-contract test

- **New file:** `src/app-api/federation/federationExposes.test.ts`
- Assertions:
  - **Frozen expected-keys list.** A literal array of the 28 expected
    `./Xxx` keys lives in the test. Assert
    `Object.keys(FEDERATION_EXPOSES)` equals it exactly (set equality — fails on
    both *missing* and *unexpected* keys). This is the human-reviewed gate: a
    diff to the public surface forces a deliberate test edit.
  - **Target files exist on disk.** For every value in `FEDERATION_EXPOSES`,
    `fs.existsSync(path.resolve(__dirname, '../../../', value))` is true.
    Catches a renamed/moved source file that would make the build emit a broken
    expose.
  - **Container identity stable.** `FEDERATION_NAME === 'cyweb'` and
    `FEDERATION_FILENAME === 'remoteEntry.js'` (plugins hard-code the
    `cyweb` scope and load `remoteEntry.js`; a rename silently breaks every
    deployed app).

#### 1.2 api-types ↔ exposes parity test

- **New file:** `packages/api-types/src/mf-declarations.test.ts` (or co-located
  under `src/app-api/federation/`, importing the `.d.ts` as text).
- Parse `mf-declarations.d.ts` for `declare module 'cyweb/<Name>'` blocks.
- Assert every declared `cyweb/<Name>` has a matching `./<Name>` in
  `FEDERATION_EXPOSES`, and that every **public hook/type** expose (the
  `Api`/`EventBus`/`AppIdContext`/`ApiTypes` subset — *not* the raw store
  exposes, which are intentionally untyped for plugin authors) has a matching
  `declare module`. Keeps shipped types from drifting from shipped code.

> Tier 1 net effect: any PR that adds/removes/renames an exposed module or
> forgets to update the published types fails `test:unit` immediately.

### Tier 2 — Build-output smoke verifier (Node, runs the real `vite build`)

Proves the federation **bundle** actually emits the public surface. The build
is slow, so this is a standalone script wired as a **CI step**, not part of the
default `test:unit` run.

- **New file:** `scripts/verify-federation-build.ts`
- **New npm script:** `"verify:federation": "tsx scripts/verify-federation-build.ts"`
  (assumes a `dist/` produced by `npm run build`; CI runs build → verify).
- Assertions against `dist/`:
  1. `dist/remoteEntry.js` exists; its source contains both `export{` … `as get`
     and `as init` (the MF container contract). A more robust variant:
     dynamically `import()` the emitted SSR entry and assert `typeof init` /
     `typeof get` are `function`.
  2. Locate the generated `dist/assets/virtual_mf-exposes*.js` chunk and assert
     it contains a `"./<Name>":` literal for **every** key in
     `FEDERATION_EXPOSES` (reuses the Tier-1 source of truth).
  3. **Shared singletons present.** Assert the build registers
     `react`, `react-dom`, `@mui/material` as shared singletons (grep the
     `localSharedImportMap` / loadShare chunks for these names). This guards the
     classic federation failure where a remote loads a *second* React/MUI copy
     and hooks/context explode at runtime.
  4. Non-empty output: each referenced exposed chunk file actually exists in
     `dist/assets/`.
- Emit a clear pass/fail summary and exit non-zero on any miss so CI gates on it.

> Caveat to document in the script: chunk filenames are content-hashed and the
> virtual-module naming is plugin-internal. Match on **stable substrings**
> (`virtual_mf-exposes`, `"./ElementApi":`) and on the `FEDERATION_EXPOSES`
> keys — never on hashes — so the test survives unrelated rebuilds.

### Tier 3 — Real-browser E2E (Playwright)

The only tests that cross the real bundler boundary `ExternalComponent.tsx` /
`init.tsx` were rewritten on. Highest value, highest setup.

#### 3.1 `cywebapi:ready` + public API presence

- **New file:** `test/playwright/cywebapi-ready.spec.ts`
- Flow: navigate to `/`, wait for the `cywebapi:ready` window event (with
  timeout), then in-page assert:
  - `window.CyWebApi` is defined and exposes all 10 domain keys
    (`element`, `network`, `selection`, `viewport`, `table`, `visualStyle`,
    `layout`, `export`, `workspace`, `contextMenu`).
  - A read-only call returns a well-formed `ApiResult` — e.g.
    `window.CyWebApi.network.getCurrentNetwork()` has a boolean `success`
    field. (Pick a call with no side effects and no network dependency.)
- This is what `cywebapi-ready.test.ts` *cannot* do — it runs against the real
  Vite bundle and real `init.tsx`, not a mock object.

#### 3.2 Real federated-remote load (gold standard)

- **New fixture:** `test/fixtures/remote-app/` — a minimal standalone MF remote
  with its own tiny `vite.config.ts` (`@module-federation/vite`, `name` ≠
  `cyweb`, `shared: { react, react-dom, @mui/material }` as singletons) exposing
  `./AppConfig` → a default-exported `CyApp` whose component renders a known
  `data-testid` marker.
- **Playwright setup:** build the fixture remote, serve it on a fixed port (a
  second `webServer` entry or a `test.beforeAll` static server), and point the
  host's runtime apps config at its `remoteEntry.js` (via
  `apps.local.json` / the `/apps.json` dev middleware in `vite.config.ts`, or a
  URL search-param add-app flow if one exists).
- **New file:** `test/playwright/remote-app-load.spec.ts`
- Assert: host injects `remoteEntry.js`, the app appears in the App Manager
  registry, and the remote component renders (marker `data-testid` visible).
  Optionally assert `window.React` identity / single-React invariant to prove
  the `shared singleton` wiring works across two separately-built bundles.
- This is the only test that exercises the full real path the migration
  rewrote: script injection → `container.init(shareScope)` →
  `container.get('./AppConfig')` → `loadRemoteApp` → render.

## 4. Recommended sequencing

1. **Tier 1.0 refactor** (extract `federationExposes.ts`, rewire `vite.config.ts`).
   Verify `npm run build` still produces an identical expose set before/after.
2. **Tier 1.1 + 1.2** contract tests. Land in `test:unit`.
3. **Tier 2** verifier + `verify:federation` script + CI step after build.
4. **Tier 3.1** `cywebapi:ready` E2E (cheap, no fixture remote).
5. **Tier 3.2** fixture-remote E2E (most setup; do last).

Each tier is independently valuable and independently landable; Tier 1+2 give
the best value-per-effort and cover the most probable migration regressions.

## 5. CI wiring (summary)

| Test | Command | When |
| --- | --- | --- |
| Tier 1 contract tests | `npm run test:unit` | every PR (already gated) |
| Tier 2 build verifier | `npm run build && npm run verify:federation` | CI build job |
| Tier 3 E2E | `npm run test:e2e` | CI e2e job (may already exist) |

## 6. Files touched / added (at a glance)

**Refactor**
- `vite.config.ts` (consume extracted exposes)

**New (Tier 1)**
- `src/app-api/federation/federationExposes.ts`
- `src/app-api/federation/federationExposes.test.ts`
- `packages/api-types/src/mf-declarations.test.ts`

**New (Tier 2)**
- `scripts/verify-federation-build.ts`
- `package.json` — `verify:federation` script (requires dependency-change approval per CLAUDE.md §1 if `tsx` isn't already present)

**New (Tier 3)**
- `test/playwright/cywebapi-ready.spec.ts`
- `test/fixtures/remote-app/` (mini MF remote + its vite config)
- `test/playwright/remote-app-load.spec.ts`

## 7. Open questions for implementation

- **`tsx` availability** for the Tier-2 script — confirm it's installed or use
  an existing runner (`ts-node`, or compile-on-the-fly). Adding a dep needs
  explicit approval (CLAUDE.md §1, Dependency Changes).
- **Runtime apps-config injection for Tier 3.2** — confirm the supported way to
  register a remote at runtime (`apps.local.json`, the `/apps.json` middleware,
  or an in-app "add app by URL" flow) so the fixture remote can be wired without
  hacking internals.
- **The 28-entry frozen list** — confirm whether the raw `*Store` exposes are
  considered public/stable contract or internal; this decides whether Tier 1.2
  parity must cover them or only the typed `Api`/`EventBus` subset.
