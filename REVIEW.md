# Data-Layer Test Coverage Review

**Scope:** `src/data/**` (IndexedDB / Dexie, serialization, snapshot, NDEx client, store hooks) and `src/models/**` (model interfaces + `impl/` functions).
**Date:** 2026-07-20
**Method:** `@vitest/coverage-v8` (measured line/branch/function coverage) + manual reading of source and existing tests to judge test *quality*, not just presence. Cross-referenced with `src/data/db/AMBIGUOUS_DB_CODE.md`.

---

## TL;DR

The model layer is in good shape on statement coverage (**86.8%**) but weaker on branches (**70.7%**). The data layer is the real gap at **~53% statements / ~47% branches**, and the gaps cluster in exactly the areas this review targeted: **IndexedDB reads and the model-validation layer that guards them.**

The single most important finding is not a low percentage — it's a **structural gap**:

> `src/data/db/validator.ts` is a complete, 22-function zod validation layer intended to guard every model object read *out of* IndexedDB. It had **0% coverage because it is called from nowhere in production or tests** — a fully-built safety net that was never connected. Meanwhile the actual DB read functions (`getWorkspaceFromDb`, `getCyNetworkFromDb`, `getTablesFromDb`, …) return raw `any` straight from Dexie with **no validation**.

As part of this review I wrote tests for the highest-priority gaps (see [What was done](#what-was-done)): `validator.ts` went **0% → 99% statements / 100% functions**, and `db/index.ts` went **77.8% → 83%**.

---

## Measured coverage (excluding test files themselves)

| Layer         | Statements | Branches | Functions |
| ------------- | ---------- | -------- | --------- |
| `src/data/`   | ~53–57%    | ~47–48%  | ~60–63%   |
| `src/models/` | 86.8%      | 70.7%    | 87.9%     |

(The `src/data/` figure moved from **53.2% → 56.7%** statements after the tests added in this review.)

### Lowest-coverage data-layer files (highest risk first)

| File | Stmts | Notes |
| ---- | ----- | ----- |
| `src/data/db/validator.ts` | **0% → 99%** (this review) | Model-shape validators for DB reads. Was entirely unwired. |
| `src/data/db/snapshot/exportApplicationState.ts` | **4.5%** | Serializes the *entire* app state to a downloadable snapshot. Almost untested. |
| `src/data/hooks/useUndoStack.tsx` | **0%** (248 stmts) | Largest untested unit in the data layer; undo/redo that persists to the `UndoStacks` store. |
| `src/data/hooks/stores/UndoStore.ts` | **15.6%** | Undo/redo store, IndexedDB-backed. |
| `src/data/hooks/navigation/urlManager.ts` | **16.6%** (145 stmts) | URL-as-state parsing/serialization; drives routing. |
| `src/data/db/snapshot/index.ts` | **50%** | Snapshot import/export orchestration (reads/writes many stores). |
| `src/data/db/index.ts` | **77.8% → 83%** (this review) | Core Dexie CRUD. Function coverage is high (96%) but error/edge branches were thin. |
| NDEx save hooks (`useSaveCyNetworkToNDEx`, `useSaveCyNetworkCopyToNDEx`, `useDeleteCyNetwork`, `useLoadCyNetwork`, `useRegisterNetwork`, `useServiceTaskRunner`) | **0–8%** | Side-effectful hooks; harder to test but currently unguarded. |
| `src/data/external-api/error-report/index.ts` | **0%** | Crash reporting. |

### Model-layer weak spots (statement coverage strong; branches lag)

| File | Stmts | Branch | Notes |
| ---- | ----- | ------ | ----- |
| `src/models/CxModel/fetchUrlCxUtil.ts` | 0% | – | Untested CX fetch util. |
| `src/models/VisualStyleModel/impl/colorPalettes.ts` | 0% | – | Data + a couple of helpers. |
| `src/models/CxModel/impl/converters/visualStyleConverter.ts` | 56.9% | **37%** | Complex CX2↔style conversion; many branches unexercised. |
| `src/models/TableModel/impl/valueTypeImpl.ts` | 76% | **44%** | Value-type coercion; branch-heavy, half the branches untested. |
| `src/models/AppModel/impl/index.ts` | 69% | 53% | |
| `src/models/CxModel/impl/validator.ts` | 79% | – | The CX2 validator (`validateCX2`) — better than the DB validator, but still has gaps. |
| `src/models/LayoutModel/impl/{Cosmos,G6,Cyjs}/*` | 0–22% | – | Layout algorithm wrappers; integration-heavy, low-ROI to unit test. |

---

## Key findings

### P0 — `db/validator.ts` is a disconnected safety net (integrity + coverage)

`validator.ts` defines 22 `validate*` functions (Workspace, Network, serialized Table, stored UI state, undo/redo stack, opaque aspects, service app, filter config, network summary, network view, …), each a pure zod `.parse()`. A repo-wide search confirms **none of them are imported by any non-test code**, and `db/index.ts` contains **zero** calls to `validate`.

Consequences:

- **DB reads are unvalidated.** `getWorkspaceFromDb` returns `db.workspace.get(id)` cast to `Workspace`; `getTablesFromDb` returns `Promise<any>`; `getCyNetworkFromDb` assembles a `CyNetwork` from raw cached rows. Corrupt, tampered, or old-schema IndexedDB data flows into the app as if it were well-typed. This is the exact failure mode the validators were written to prevent.
- **A latent inconsistency with the project's stated posture.** `EXTERNAL_INPUT_VALIDATION_POLICY.md` mandates validating external CX2 input; IndexedDB is a persisted, user-mutable store that arguably deserves the same treatment on read. The tooling to do it already exists — it's just not plugged in.
- Some schemas are also **stricter than the live data** (e.g. `activeNetworkView` uses a non-empty `IdType`, but an empty active view is a legitimate state). Wiring the validators in *without tests* would risk rejecting valid persisted state and bricking a user's workspace.

**Recommendation:** Decide explicitly — *connect* the validators into the `getXxxFromDb` read path (fail soft: log + fall back to a safe default rather than throwing), or *delete* them as dead code. Do not leave a 500-line safety net unused and untested. The [tests added below](#what-was-done) make the "connect" path safe by locking each validator's contract first.

### P1 — Documented risky behaviors in `AMBIGUOUS_DB_CODE.md` were untested

`db/AMBIGUOUS_DB_CODE.md` already catalogs behavioral quirks in `db/index.ts`. Several were unguarded by tests, so any "fix" could silently change behavior:

- **#5 Workspace selection:** `getWorkspaceFromDb()` with no id returns `allWS[0]` (first by primary key), despite a `// TODO: pick the newest one in production`. The variable is even misleadingly named `lastWs`. (Now pinned by a regression test.)
- **#8 / #9 Silent error swallowing:** `deleteNetworkFromDb` logs-and-continues, and `getAllServiceAppsFromDb` returns `[]` on error — inconsistent with the throw-on-error convention elsewhere, and easy to regress into masking real failures.
- **#6 Circle-packing views** are filtered out before storage (already covered by an existing test — good).

### P1 — Largest untested units are IndexedDB-adjacent

`useUndoStack.tsx` (248 statements, 0%), `UndoStore.ts` (15.6%), and `snapshot/exportApplicationState.ts` (4.5%) are all substantial and all read/write IndexedDB. Undo/redo persistence and full-state snapshot export are precisely the kind of serialization-heavy code where silent data-shape bugs hide. These are the next targets after P0.

### P2 — Model layer: raise branch coverage, not statement coverage

86.8% statements but 70.7% branches means the *happy paths* are well tested and the *error/edge branches* are not. The worst offenders are the CX2↔model converters (`visualStyleConverter.ts` at 37% branch) and `valueTypeImpl.ts` (44% branch) — both are conversion code where an unhandled branch = corrupted data on round-trip. Focus new model tests on malformed/edge inputs rather than more valid-input cases.

### Note — Environment fragility (not a repo defect)

This working copy had not been reinstalled since `cytoscape-biological-flow` was added to `package.json` (commit `d18dacea`, 2026-06-29), so `src/models/LayoutModel/impl/layoutSelection.test.ts` **failed to load** during the first coverage run (unresolved import) and reported `(0 test)`. After `npm install`, all 144 test files pass. CI installs fresh, so it is not red — but the failure mode (a test that silently collects **zero tests** instead of failing loudly) is worth being aware of when reading local coverage.

---

## What was done

Per the review scope, regression tests were written for the highest-priority gaps and verified passing.

**New file — `src/data/db/validator.test.ts` (40 tests):** contract tests for the IndexedDB read-path validators. Each domain asserts both directions (well-formed model accepted; malformed payload rejected), and covers the tricky bits: `Map`-vs-entry-tuple serialization forms, the table-row `superRefine`, and ISO-string→`Date` coercion. This locks the validators' behavior so they can be safely connected (P0).

- `validator.ts`: **0% → 99.2% statements, 100% functions, 75% branches.**

**Extended — `src/data/db/db.test.ts` (+3 regression tests, 22 → 25):**

- `getWorkspaceFromDb()` returns the first stored workspace when no id is given and several exist (pins AMBIGUOUS #5).
- `getWorkspaceFromDb(unknownId)` falls back to the first workspace rather than creating one or returning `undefined`.
- App-setting CRUD round-trip (`put`/`get`/`delete`) and `undefined` for a missing key.

- `db/index.ts`: **77.8% → 83% statements**, workspace-selection and app-settings branches now covered.

**Verification:** `npx vitest run` → **144 files / 2156 tests pass** (1 skipped). `npx oxlint` clean on both files. No production code was modified.

---

## Suggested backlog (prioritized)

| Priority | Item | Effort |
| -------- | ---- | ------ |
| **P0** | Decide: wire `db/validator.ts` into the `getXxxFromDb` read path (fail-soft), or delete it. Tests are now in place either way. | M (product decision + wiring) |
| **P0** | Reconcile over-strict validator schemas with live data (e.g. empty `activeNetworkView`, optional fields) before any wiring. | S |
| **P1** | Test `useUndoStack.tsx` / `UndoStore.ts` — undo/redo persistence round-trips and stack-size limits. | M |
| **P1** | Test `snapshot/exportApplicationState.ts` + `snapshot/index.ts` import/export round-trip on a seeded DB. | M |
| **P1** | Add regression tests pinning the error-swallowing paths (#8/#9) so intended vs. accidental swallowing is explicit. | S |
| **P2** | Raise branch coverage on CX2 converters (`visualStyleConverter.ts`, `valueTypeImpl.ts`) with malformed/edge inputs. | M |
| **P2** | Test `urlManager.ts` parse/serialize (routing correctness). | S–M |
| **P3** | Consider a coverage threshold gate in CI for `src/data/db/**` to prevent regression below current levels. | S |

---

*Coverage numbers were produced with `npx vitest run --coverage --coverage.include='src/data/**/*.ts' --coverage.include='src/models/**/*.ts'`. Scope the `include` globs to `*.ts`/`*.tsx` — a bare `src/models/**` makes v8 try to parse `README.md`/`LICENSE`/`.gitignore` and aborts report generation.*
