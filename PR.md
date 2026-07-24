# Expand test coverage: unit tests, e2e flows, and coverage tooling

## Summary

This branch raises test coverage across the codebase without changing runtime
behavior. It adds **31 new unit/spec files** and **5 new Playwright e2e specs**,
wires **coverage collection into CI**, and makes a handful of **minimal,
test-only source extractions** so that previously-inline logic becomes
independently testable. No user-facing behavior changes.

`git diff --stat development...test/coverage`: **59 files, +6,713 / −3,421**
(the bulk of the deletions are regenerated CX2/HCX fixture files, not code).

## Motivation

Several feature and hook modules had pure logic embedded inside components and
init routines with no direct test coverage, and CI reported unit results with no
coverage artifact. This PR closes those gaps so regressions surface earlier and
coverage is visible per-run.

## What changed

### Coverage tooling & CI

- `vitest.config.ts` — scope coverage to `src/**` (excluding tests, `.d.ts`,
  and `__mocks__`) and emit `text-summary`, `html`, and `lcov` reporters.
- `.github/workflows/ci.yml` — the unit-test job now runs `npm run test:coverage`
  and uploads the `coverage/` report as a build artifact (14-day retention).
- `.gitignore` — ignore the local `coverage/` output.

### New unit / spec coverage (31 files)

Notable areas now under test:

- **Models** — `CyNetworkModel` node/edge operation cores, `HierarchyViewer`
  HCX validators and utilities (filter/hierarchy/subnetwork query).
- **Hooks** — `useLoadCyNetwork`, `useLoadNetworkSummaries`, `useRegisterNetwork`,
  `useSaveCyNetworkToNDEx`, `useServiceTaskRunner`, plus `appLifecycle`
  mount/unmount helpers and the `ContextMenuItemStore`.
- **Features** — `CyjsRenderer` style/element mappers, `ToolBar` app-menu tree
  builder and run flow, `Vizmapper` utilities (continuous mapping handles,
  custom-graphics chart/numeric/type-guard utils), `CirclePackingLayout` utils,
  and `AppShell` URL/UI-state semantics.
- **Init** — `keycloak` error-message parsing and `tabManager` channel naming.

### Minimal source extractions (test-only, behavior-preserving)

These refactors move existing inline logic into named, exported functions so it
can be unit-tested directly. Behavior is unchanged.

- `src/features/AppShell.tsx` — extracted `mergeUiStateWithSearchParams` and
  `buildFilterConfigFromSearchParams` from the inline mount/restore logic.
- `src/init/keycloak.ts` — hoisted `parseUserInfoFromErrorMessage` to a module
  export.
- `src/init/tabManager.ts` — `generateChannelName` now takes injectable
  `domain`/`port` params (defaulting to `window.location`) for testing.

### New e2e coverage (5 Playwright specs)

- `local-file-import.spec.ts`, `url-import.spec.ts` — network import flows.
- `network-download.spec.ts` — export flow.
- `undo-redo.spec.ts` — undo/redo history.
- `workspace-persistence.spec.ts` — persistence across reload.
- `test/playwright/fixtures.ts` — shared fixture helpers for the above.

### Fixture fix

- `scripts/generate-test-fixtures/generate-cx2.ts` — the CX2 generator emitted
  `double`-declared attributes (`score`, `weight`) as strings via `toFixed`,
  which `validateCX2` rejects; they are now coerced back to `Number`. The CX2/HCX
  fixture files under `test/fixtures/` were regenerated accordingly (accounts for
  most of the diff line count).

## Testing

- `npm run test:coverage` — unit tests pass with coverage collected; IndexedDB
  layer floors (per `REVIEW.md`) are enforced.
- `npm run test:e2e:chromium` — new import/export/undo/persistence specs pass.

## Risk

Low. Source changes are limited to behavior-preserving extractions; the remainder
is test code, fixtures, and CI configuration.
