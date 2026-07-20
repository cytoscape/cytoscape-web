# Data-Layer Test Coverage & Correctness Review

**Scope:** `src/data/**` (IndexedDB / Dexie, serialization, snapshot, NDEx client, store hooks) and `src/models/**` (model interfaces + `impl/` functions).
**Date:** 2026-07-20 (round 1: coverage + validator focus; round 2: deep correctness/architecture pass; round 3: test-driven fixes for the P0s, same day)
**Method:** `@vitest/coverage-v8` measured coverage + manual source reading, plus a round-2 multi-reviewer pass over four subsystems (persistence middleware/undo, serialization/snapshot/migrations, store layer/cross-store flows, model impls/CX converters). Round-2 claims marked **[verified]** were confirmed by direct code reading or by executing the real functions; the rest were verified against source by the reviewing agent. Cross-referenced with `src/data/db/AMBIGUOUS_DB_CODE.md`.

---

## TL;DR

Coverage numbers (data layer ~57% statements / ~48% branches; models 86.8% / 70.7%) are the *least* interesting result of this review. The deep pass found that several core data-layer mechanisms are silently broken or structurally unsound:

1. **The Dexie migration mechanism is dead code** — the constructor ordering guarantees `applyMigrations` always early-returns, so any migration added per the documented workflow will never run. **[verified]** (P0)
2. **The store persistence middleware persists the wrong network's data** — every persist wrapper keys the DB write off `workspace.currentNetworkId`, not the network the action actually mutated. Edits to non-current networks (hierarchy sub-networks, App API calls, async layout completion) are silently never persisted. **[verified]** (P0)
3. **Snapshot import destroys user workspaces before validating the file** — `db.workspace.clear()` runs before the file is read; a corrupt file leaves an orphaned-empty workspace. **[verified]** (P0)
4. **"Delete all networks" clears the wrong database** — `OpaqueAspectStore.deleteAll` calls idb-keyval's `clear()` (a different IndexedDB database entirely); the correct `clearOpaqueAspectsFromDb` has zero callers. **[verified]** (P0)
5. Round 1's structural finding: `db/validator.ts` was a complete, tested, 22-function zod validation layer **called from nowhere** — DB reads returned unvalidated `any`. **Status: wired in OBSERVE mode (round 7)** — every major read path (workspace, network, tables, visual style, network views, summaries, UI state, apps, service apps, opaque aspects, undo stacks) now validates and logs a warning on mismatch while always returning the data unaltered. Zero bricking risk; enforcement can be escalated once field warnings are quiet. The two known over-strict schemas (empty `currentNetworkId` / `activeNetworkView` are legitimate states) were reconciled first, pinned by tests.

> **Round-3/4 status:** items 1–4 above plus the auth-token leak (R2-11) are now **FIXED**, each proven by a regression test that was written first and shown to fail against the old code. R2-2 is fully closed: the four Immer-managed stores share the `persistNetworkSlices` middleware, and NetworkStore (whose in-place cy mutation defeats identity diffing) got per-action persistence in round 4. Round 4 also fixed R2-22 (`as const` + `valueType2BaseType`), which surfaced three further latent inconsistencies — and corrected a round-2 error: `npm test` **does** already run `tsc --noEmit` via `lint:tsc`. Details in [What was done](#round-3-test-driven-fixes-for-the-p0s).

Beyond these, the round-2 pass catalogs ~35 further defects: unhandled persistence rejections, lossy snapshot round-trips (Maps → `{}`, Dates → strings), an auth-token leak in the debug state export, a validation-policy hole in a Module Federation entry point, and a cluster of model-layer coercion/conversion bugs (empty string → `0`, list-of-string round-trip corruption, invalid sort comparator, silently dropped continuous mappings). Details below.

---

## Measured coverage (excluding test files themselves)

Re-measured 2026-07-20 (round 2); matches round-1 baseline.

| Layer         | Statements | Branches | Functions |
| ------------- | ---------- | -------- | --------- |
| `src/data/`   | 56.7%      | 47.8%    | 62.7%     |
| `src/models/` | 86.8%      | 70.7%    | 87.9%     |

### Lowest-coverage data-layer files (highest risk first)

| File | Stmts | Notes |
| ---- | ----- | ----- |
| `src/data/hooks/useUndoStack.tsx` | **0%** (248 stmts) | Largest untested unit; undo/redo that persists to `UndoStacks`. |
| `src/data/db/snapshot/exportApplicationState.ts` | **4.5%** | Full app-state debug export. Almost untested — and leaks tokens (see P1). |
| `src/data/external-api/error-report/index.ts` | **0%** | Crash reporting. |
| `src/data/hooks/navigation/urlManager.ts` | **16.6%** | URL-as-state parsing/serialization; drives routing. |
| `src/data/hooks/useDeleteCyNetwork.ts` | **1%** | The most consequential multi-store cascade in the app. No test file. |
| `src/data/db/snapshot/index.ts` | **50%** | Snapshot import/export orchestration. |
| `src/data/hooks/stores/UndoStore.ts` | 15.6% → covered (round 2 spec added) | |
| `src/data/db/validator.ts` | 0% → 99% (round 1) | Still unwired in production. |
| `src/data/db/index.ts` | 77.8% → 83% (round 1) | Core Dexie CRUD. |
| NDEx save/load hooks (`useSaveCyNetworkToNDEx`, `useSaveCyNetworkCopyToNDEx`, `useLoadCyNetwork`, `useRegisterNetwork`, `useServiceTaskRunner`) | 0–8% | Side-effectful hooks; currently unguarded. |

### Model-layer weak spots (statements strong; branches lag)

| File | Stmts | Branch | Notes |
| ---- | ----- | ------ | ----- |
| `src/models/CxModel/impl/converters/visualStyleConverter.ts` | 56.9% | **37%** | Real bugs found in the unexercised branches (see model findings). |
| `src/models/NetworkModel/impl/networkImpl.ts` | 80.4% | **12.5%** | Core network model; edge cases nearly untested. |
| `src/models/TableModel/impl/valueTypeImpl.ts` | 76% | **44%** | Value coercion — several confirmed bugs (see model findings). |
| `src/models/CxModel/fetchUrlCxUtil.ts` | 0% | – | Untested CX fetch util; also does I/O inside the models layer. |
| `src/models/CxModel/impl/validator.ts` | 79% | 75% | `validateCX2` — can throw a non-Error; scope weaker than converters assume. |

---

## Round 1 findings (validator focus) — summary

Full text in git history (`1fa02ec4`). Key points, still current:

- **P0 — `db/validator.ts` is a disconnected safety net.** 22 zod validators intended to guard every IndexedDB read; zero production callers. `getWorkspaceFromDb`/`getTablesFromDb`/`getCyNetworkFromDb` return raw `any` from Dexie. Decide: wire them into the read path (fail-soft) or delete them. Round-1 tests (40, in `validator.test.ts`) lock each validator's contract so wiring is safe. Some schemas are stricter than live data (e.g. non-empty `activeNetworkView`) and must be reconciled first.
- **P1 — `AMBIGUOUS_DB_CODE.md` behaviors pinned by tests**: workspace selection returns first-by-primary-key (#5), silent error swallowing in `deleteNetworkFromDb`/`getAllServiceAppsFromDb` (#8/#9).
- Round-1 test additions: `src/data/db/validator.test.ts` (40 tests), `db.test.ts` +3.

---

## Round 2 findings

### P0 — broken core mechanisms **[all verified against source]**

**R2-1. Dexie migrations can never run.** `db/index.ts` declared `this.version(currentVersion).stores(Keys)` *before* calling `applyMigrations(this, currentVersion)`. Dexie's `version()` sets `verno` synchronously, so the guard in `applyMigrations` (`currentDbVersion >= versionNumber`) was always true and the function early-returned — any migration added to the `migrations` array (the documented place for schema changes per AGENTS.md) was silently never registered. The native schema still upgraded, but the data transform never ran → silent data-shape corruption on the first real migration. Latent only because the array is empty today.
**Status: FIXED (round 3).** `applyMigrations` replaced by a synchronous, unconditional [`registerMigrations`](src/data/db/migrations.ts) called from the constructor — Dexie itself decides at `open()` which upgrade functions the on-disk version needs (verified: `version(n)` on an already-declared version returns the existing Version instance, so upgrades attach correctly even when a migration targets `currentVersion`). Regression test `migrations.test.ts` — "a registered migration runs under the production constructor ordering" seeds a v8 DB with old-shape data, replays the exact constructor flow at v9, and asserts the transform ran; it failed before the fix.

**R2-2. Persist wrappers persist the `currentNetworkId` slice, not the mutated one.** [TableStore.ts:38-52](src/data/hooks/stores/TableStore.ts:38), `NetworkStore.ts:34-47`, `VisualStyleStore.ts:44-56`, `ViewModelStore.ts:36-49`, `UndoStore.ts:23-37` — all read `useWorkspaceStore.getState().workspace.currentNetworkId`, run `set(args)`, then write `slice[currentNetworkId]` to DB, ignoring the networkId the action received. Concrete losses:
- HierarchyViewer sub-network table edits (`WorkspaceEditor.tsx` passes `activeNetworkView` ≠ `currentNetworkId` to TableBrowser): the edit updates memory, but the DB write re-saves the *root* network's unchanged tables. Reload reverts the edit.
- Sub-network undo stacks are never persisted (`postEdit` deliberately targets `activeNetworkView`; the wrapper persists `currentNetworkId`).
- App API calls on arbitrary `networkId` (external apps), MergeNetworks writing to a not-yet-current network, async layout completion after a network switch — all persist the wrong slice or nothing.
- Corollary: when `currentNetworkId` dangles or has no slice, **all** persistence on these stores silently no-ops.
**Status: FIXED for TableStore / ViewModelStore / VisualStyleStore / UndoStore (round 3).** All four now share one middleware, [`persistNetworkSlices`](src/data/hooks/stores/persistNetworkSlices.ts): after each `set` it diffs the networkId → slice map by object identity (cheap — Immer structural sharing gives a new reference only to the mutated network's slice) and persists exactly the changed slices, keyed by the mutated network. Also fixes the R2-5 unhandled rejections for these stores (writes are fire-and-forget with an explicit error log) and removes the redundant explicit `put` calls the `add` actions carried as workarounds. Regression tests (all failed before the fix): `TableStore.spec.ts` / `ViewModelStore.spec.ts` / `VisualStyleStore.spec.ts` "persists the mutated network … even when it is not the current network", and the flipped `UndoStore.spec.ts` persistence suite.
**Status update (round 4): NetworkStore is now fixed too — R2-2 is fully closed.** Because its cy-backed `Network` objects mutate in place (identity diffing can't see changes), NetworkStore got per-action persistence instead: every mutating action (`setNetwork`, `addNode(s)`, `addNodesAndEdges`, `addEdge(s)`, `deleteNodes`, `deleteEdges`, `moveEdge`) calls a `persistNetwork` helper with the network it actually mutated; the old current-network wrapper is deleted. Three regression tests in `NetworkStore.spec.ts` (mutate-non-current persists it / doesn't rewrite unrelated networks / deletions keyed correctly) failed pre-fix and now pass. **WorkspaceStore** (singleton, reference-diffed) remains untouched by design. Analysis refinements from round 3: `TableStore.add`/`ViewModelStore.add`/`VisualStyleStore.add` *did* explicitly persist with the correct id at creation time (which is why non-current networks existed in the DB at all) — the defect applied to every mutation *after* creation.

**R2-3. `importDatabaseSnapshotFromFile` clears workspaces before reading the file.** `db.workspace.clear()` ran after only extension/size checks, before `file.text()`, `JSON.parse`, and structure validation. Corrupt/oversized/malformed file → throw → next load silently creates a fresh empty workspace; the user's network list is orphaned. Reachable from Help ▸ Import (`ImportDatabaseMenuItem.tsx`).
**Status: FIXED (round 3).** The clear moved into `importDatabaseSnapshot` behind a new `clearWorkspace` option that runs only **after** parse + structure validation succeed; the file entry point passes `clearWorkspace: true` instead of clearing eagerly (also removes the entry-point asymmetry noted in R2-8). Regression tests in `snapshot.test.ts` ("workspace preservation on failed import") feed a corrupt-JSON file and a structurally invalid snapshot and assert the pre-existing workspace survives; both failed before the fix.

**R2-4. `OpaqueAspectStore.deleteAll` clears a different database.** The store imported `clear` from `idb-keyval` and called it in `deleteAll` — that clears idb-keyval's default `keyval-store` DB, not `cyweb-db`. The correct `clearOpaqueAspectsFromDb` had zero production callers. "Delete all networks" left every network's opaque aspects in IndexedDB forever; re-adding a network with the same UUID could rehydrate stale aspects. The spec mocked `idb-keyval` and never asserted it, hiding the bug.
**Status: FIXED (round 3).** `deleteAll` now calls `clearOpaqueAspectsFromDb()`; the `idb-keyval` import is gone (the package is now unused in `src/` entirely — it can be dropped from `package.json` in a dependency pass). Regression tests in `OpaqueAspectStore.spec.ts` assert the cyweb-db clear/delete calls; the `deleteAll` test failed before the fix.

### P1 — persistence & snapshot correctness

**R2-5. Persistence failures are unhandled promise rejections.** The `put*ToDb` functions log and rethrow; the async persist wrappers await them inside an intercepted `set` whose promise no caller awaits; `WorkspaceStore`/`ViewModelStore` use `void put…().then()` with no `.catch`. A `QuotaExceededError` (config allows 500MB files) means every subsequent edit fails to persist with no UI surfacing — the workspace looks fine until reload.
**Status: partially fixed (round 3).** The four stores on `persistNetworkSlices` now catch and log persistence failures. Still open: surfacing failures to the user (MessageStore), and the fire-and-forget `void put…()` calls inside other store actions (WorkspaceStore, NetworkStore, OpaqueAspectStore, NetworkSummaryStore, UiStateStore).

**R2-6. Snapshot export is lossy for Maps and Dates.** `exportDatabaseSnapshot` used raw `JSON.stringify` on `table.toArray()`. `undoStacks` records legitimately contain live `Map`s (SET_BYPASS_MAP, MOVE_NODES position maps, DELETE_COLUMN embedding a whole `Table`) → exported as `{}`; `summaries` `creationTime`/`modificationTime` are `Date` → exported as ISO strings and imported back as strings. Export→import round-trip silently corrupted undo stacks and date fields.
**Status: FIXED (round 5).** Export tags rich values (`{ __cywebType: 'Map' | 'Set' | 'Date', … }`) via a stringify replacer; import revives them via a parse reviver; `sanitizeRecord` preserves (and recursively sanitizes) revived Map/Set/Date instances instead of flattening them to `{}`. The reviver is self-describing, so legacy untagged snapshots (including all five backward-compat fixtures) still import unchanged. Regression test: full Map + Date round-trip through export→clear→import, failed pre-fix. Remaining edge (documented, not fixed): `NaN`/`Infinity` in numeric fields still become `null`.

**R2-7. dexie-observable internal tables are exported and re-imported.** Export iterated `db.tables` (includes `_changes`, `_syncNodes`, `_intercomm`, `_uncommittedChanges`); import did **not** filter to `ObjectStoreNames` (the validator *warned* unknown stores "will be ignored", but the importer imported them): foreign change-log rows and another browser's sync-node records were `put()` into local change-tracking tables, with `rev` collisions and cross-tab replay as plausible consequences.
**Status: FIXED (round 5).** Export skips every table not in `ObjectStoreNames`; import filters `storesToImport` the same way, so the validator's "will be ignored" warning is finally true. Regression tests (export contains no `_`-prefixed keys; a crafted snapshot with `_changes`/`_syncNodes` records imports without touching those tables) failed pre-fix.

**R2-8. "Replace" import only replaces `workspace`.** With `merge: false`, only `db.workspace` was cleared; all other stores were merged-by-key. The UI dialog says "This will replace all existing data" — it didn't; networks absent from the snapshot remained as permanently orphaned rows.
**Status: FIXED (round 5).** The round-3 `clearWorkspace` option became `clearExisting`: after validation succeeds, **all** app object stores are cleared (dexie-observable internals untouched), so the file-import path's "replace all existing data" wording is now accurate. Regression test (network created after the snapshot is gone post-import; snapshot networks present) failed pre-fix.

**R2-9. `toPlainObject` fallback silently destroys data.** [immerSerialization.ts:60-96](src/data/db/serialization/immerSerialization.ts:60): when `structuredClone` throws (any function anywhere in the graph), `manualDeepCopy` turns Maps/Sets/Dates into `{}`, drops **all** `_`-prefixed keys, and blanks shared (diamond) references because the visited-set is never unwound. Since `toPlainObject` guards every store persistence path, one stray callback in a persisted object degrades the *entire* object silently. *Pinned by round-2 tests in `immerSerialization.test.ts`.*

**R2-10. Undo stacks orphaned in IndexedDB; Safari hazard.** `UndoStore.deleteStack` only mutated memory — `deleteUndoRedoStackFromDb`/`clearUndoRedoStackFromDb` had zero app callers, so deleted networks' stacks persisted and could rehydrate onto a re-added NDEx network with the same UUID (undo then "restores" a previous session's state). Separately, `putUndoRedoStackToDb` stores Maps raw, violating the repo's own Map-serialization policy (`mapSerialization.ts` documents Safari IDB can't structured-clone Maps) → `DataCloneError` → unhandled rejection (R2-5) on affected Safari versions.
**Status: FIXED (rounds 3/8/9).** Round 3: `removeSlice` deletes the IndexedDB row when a stack is removed from the store. Round 8: every deletion path goes through the orchestrator, which calls `deleteStack` (and the round-2 claim that deletion flows never called it was corrected — the hook already did). Round 9: undo stacks are encoded to tagged plain objects on write (`serialization/richValues.ts`) and decoded on read, so rows are Safari-safe (no raw Map instances in IndexedDB); legacy raw-Map rows still decode. Regression test pins that the raw stored row contains no Map instances while the read path returns real Maps.

**R2-11. Debug app-state export leaks auth tokens.** `exportApplicationState.ts` serialized `useCredentialStore.getState()` — including the Keycloak client whose enumerable props contain `token`/`refreshToken`/`idToken` after login — into a JSON file explicitly intended to be shared for debugging. No redaction. *(Security.)*
**Status: FIXED (round 3).** The credential store is no longer serialized at all; the export writes a `[REDACTED: credentials are never exported]` placeholder. Regression test `exportApplicationState.test.ts` seeds the store with sentinel token strings and asserts none appear anywhere in the exported JSON; before the fix the test's failure diff showed the tokens inline in the export. (First test coverage for `exportApplicationState.ts` at all — previously 4.5%.)

**R2-12. Delete-then-re-add races; production papers over it with `waitSeconds(1)`.** Store `delete`/`add` actions fire `deleteXFromDb`/`putXToDb` without awaiting or sequencing per key; `UpdateNetworkDialog.tsx` literally sleeps 1 second between deleting and re-adding the same network id. Slow IndexedDB (large network) → the delete resolves after the re-add's put → the "updated" network vanishes from cache on reload.

**R2-13. `currentNetworkId` can dangle after delete; the invariant is owned by nobody.** `WorkspaceImpl.deleteNetwork` clears it only when the workspace empties. `useDeleteCyNetwork(id, {navigate:false})` left it pointing at the deleted network; some UI callers repaired it manually, the App API's `networkApi.deleteNetwork` did not.
**Status: FIXED (round 8).** The new `deleteNetworkOrchestrator` owns the invariant: after removing the network from the workspace it repairs `currentNetworkId` (first remaining network, or `''`) whenever the deleted network was current — regardless of navigation — and never switches networks otherwise (the old `navigate:true` paths switched to the first remaining network even when deleting a *non-current* one, which was surely unintended; that behavior change is deliberate and documented). Regression tests in both `useDeleteCyNetwork.test.tsx` and `networkApi.test.ts` failed pre-fix.

**R2-14. No snapshot format versioning.** `metadata.version` is written on two historically incompatible scales (Dexie `verno` now; native IDB version in older exports/fixtures), never validated, never used to transform records.
**Status: partially fixed (round 5).** Exports now stamp `metadata.formatVersion` (2 = tagged rich values; absent = legacy 1), and the tagged format is self-describing so no version branching is needed on read. Still open: the migration-bypass concern — imported records are not routed through Dexie upgrade functions, so once the first real schema migration ships, snapshot import needs a transform step keyed on the stored DB version.

### P1 — model layer & CX pipeline **[runtime-verified where marked]**

**R2-15. Empty/whitespace strings coerce to numbers.** `!isNaN(+'')` passed (`+'' === 0`). Clearing a numeric cell in TableBrowser wrote `0`; clearing a ListInteger cell wrote `[0]`; `deserializeValueList(ListString,'')` → `['']` not `[]`. **[verified at runtime]**
**Status: FIXED (round 5).** Blank input is invalid for numeric types (clearing a numeric cell is now rejected instead of silently writing 0) and deserializes to `[]` for all list types. Whitespace-padded real numbers still accepted. 8 regression tests failed pre-fix.

**R2-16. `list_of_string` round-trip corruption.** Serialize joins with `', '`, deserialize splits on `', '`: `['a, b','c']` → `'a, b, c'` → `['a','b','c']`. Any element containing `', '` is corrupted the first time the cell is opened. Symmetric quirk: `'1,2,3'` (no spaces) was rejected as ListInteger input. **[verified at runtime]**
**Status: partially fixed (round 5).** Validation and deserialization now share one `splitSerializedList` helper. Non-string lists (numbers/booleans can't contain commas) tolerate whitespace variation — `'1,2,3'` now parses. String lists keep the strict `', '` delimiter so elements containing a bare comma survive. **Open product decision:** elements containing `', '` itself still cannot round-trip losslessly — that needs an escaping scheme (user-visible format change); the lossy behavior is pinned by a `KNOWN LIMITATION` test.

**R2-17. `compareNumbers` violates comparator antisymmetry for missing values.** `(a ?? Infinity) - (b ?? -Infinity)` → both orderings of `(5, undefined)` returned +∞; sorting numeric columns with missing values was engine-dependent and unstable; NaN cells returned NaN. **[verified at runtime]**
**Status: FIXED (round 5).** Rewritten as a proper comparator: missing values (undefined/null/NaN) sort to the bottom for both directions, two missing values compare equal, and NaN never leaks out. 5 regression tests, 4 failed pre-fix.

**R2-18. `validateCX2` can throw a non-Error.** `default: throw z.string()` — `throw` instead of `return`, throwing a ZodString instance. Any CX2 with an unknown attribute-declaration `d` type broke the "returns ValidationResult" contract; callers reading `error.message` got `undefined`.
**Status: FIXED (round 6).** `cx2TypeToZod` returns `undefined` for unknown types; `createAttributeSchema` reports a proper `Unknown attribute type '<d>' declared for attribute '<name>'` validation error. 2 regression tests failed pre-fix.

**R2-19. CX2 that *passes* validation crashes conversion.** `tableConverter.ts` threw TypeError on `attributeDeclarations: []` or `[{}]` with attributed nodes; `visualStyleConverter.ts` threw on mappings without `definition` and malformed bypass `v` payloads. `validateCX2` never inspects `visualProperties`, bypasses, or mapping definitions — "validated" is weaker than what converters assume.
**Status: FIXED (round 6).** tableConverter defaults missing declaration objects to `{}` (columns and rows both guarded); visualStyleConverter skips-and-logs mappings without a definition and malformed bypass entries (well-formed sibling entries still apply). 4 regression tests failed pre-fix. Remaining note: `metaData` is required by the validator while converters handle its absence — unchanged, documented.

**R2-20. Valid 2-entry continuous mappings silently discarded on CX import.** The control-point loop iterates only middle entries; with exactly 2 map entries the mapping was dropped with zero diagnostics. Related: gt/lt out-of-range values were double-converted, and the continuous mapper mapped `null` → `ltMinVpValue` and `NaN` → `undefined`. **[mapper behavior verified at runtime]**
**Status: FIXED (round 6), plus a new latent bug found and fixed while testing:** the d3 interpolation domain was built from middle control points ONLY — a mapping with fewer than two middle points had a degenerate domain and returned `undefined` for every in-range value, and the segment between a boundary and the first control point was flat-clamped instead of interpolated. The min/max boundaries are now interpolation anchors (deduped, sorted); 2-entry mappings import as valid mappings with `controlPoints: []`; gt/lt use the already-converted boundary values; the mapper returns the default for `null`/`NaN`/non-numeric input and handles the degenerate equal-min/max case. 5 regression tests failed pre-fix (including in-range interpolation, broken even for the old "working" case).

**R2-21. Validation-policy hole: Module Federation task hook converts unvalidated external CX2.** `useCreateNetworkFromCx2` called the explicitly non-validating `createCyNetworkFromCx2` on external-app-supplied data (exposed as `'./CreateNetworkFromCx2'`). All other entry points (FileUpload, ServiceApps, app-api, NDEx load/query, URL import) were audited and do validate. This was the one real hole vs `EXTERNAL_INPUT_VALIDATION_POLICY.md`. (The policy doc also references two nonexistent paths.)
**Status: FIXED (round 6).** The hook validates with `validateCX2` and throws a formatted `CX2 validation failed: …` error (via `formatValidationErrors`, which gains its first production caller) before any conversion. New test file `useCreateNetworkFromCx2.test.tsx` — first coverage of this hook; the invalid-CX2 test failed pre-fix (previously crashed deep inside cytoscape.js instead).

**R2-22. Type-level exhaustiveness silently disabled.** `VisualPropertyValueTypeName.ts` lacked `as const` → its type widened to `string` → `Record<…>` completeness wasn't checked. Concrete casualty: `valueType2BaseType` had `'boolean'` written twice (`ValueTypeName.Boolean` and `VisualPropertyValueTypeName.Boolean` are the same key; the second write set it to `'string'`, letting any single-value column passthrough-map onto boolean visual properties) and was missing the `'color'`/`'customGraphic'`/`'customGraphicPosition'` keys. **[verified with tsc]**
**Correction to the round-2 claim:** `npm test` **does** typecheck — `test` → `lint` → `lint:tsc` (`tsc --noEmit`) is already wired in `package.json`. The round-2 "CI blind spot" claim was wrong; the gate exists. The real gap was only the widened enum making the gate blind to this class of bug.
**Status: FIXED (round 4).** `as const` added; `valueType2BaseType` corrected (single `'boolean'` entry = `'boolean'`; missing keys added as `null`, preserving current mapping permissions — whether string→color passthrough *should* be allowed remains an open product question). Enforcing the type immediately surfaced and fixed three more latent inconsistencies: (1) 27 dead keys in the Vizmapper type-keyed renderer map that were actually visual property *names* (`nodeImageChart1..9` etc.), unreachable at runtime, removed; (2) the enum value `'HorizontalAlign'` was the lone non-camelCase outlier, disagreeing with the renderer-map key — normalized to `'horizontalAlign'` (no VP anywhere declares this type, so nothing persisted can contain it); (3) `'nodeLabelPosition'` was a real value type used by `defaultVisualStyle` and the renderer map but missing from the enum — added. Also: `visualStyleApi.test.ts` was passing `'double'` (a column type) where a VP value type belongs — corrected to `'number'`. Regression tests: two in `mappingFunctionImpl.test.ts` (number/string column → boolean VP passthrough must be rejected) failed pre-fix.

### P2 — notable (abbreviated)

- `ViewModelStore.getViewModel(networkId, viewModelId)` matches on `view.id` (the network id) instead of `viewId` — a specific secondary view can never be addressed; **the spec codified the bug**. **FIXED (round 10):** matches on `viewId`; the spec assertion was rewritten to the intended behavior (all callers used the one-arg form, so no behavior change for existing code). Contract drift remains: `ViewModelStoreModel`'s `targetViewId` params are unimplemented; `delete` removes all views.
- circlePacking views are excluded from DB in `add` but re-persisted by the wrapper on the next set (any selection click) — the stated intent is defeated. **FIXED (round 3):** the ViewModelStore `putSlice` filters circlePacking views on every write, pinned by "never writes circlePacking views to the DB" in the spec.
- `ViewModelStore.add` mutates its input argument; `TableStore.addRows` is a silent no-op; several TableStore actions crash on missing table while sibling actions null-check; `NetworkStore.moveEdge` emits `UpdateEventType.ADD` and has zero tests; stray `lastModified` in NetworkStore initial state.
- Network deletion leaks per-network `UiStateStore` entries (`visualStyleOptions`, `columnUiState` — both persisted) and `FilterStore` search indexes (in-memory) — in both `useDeleteCyNetwork` *and* its app-api mirror. **FIXED (round 8):** new `deleteNetworkUiState`/`deleteAllNetworkUiState` (UiStateStore) and `deleteNetworkIndex`/`deleteAllNetworkIndexes` (FilterStore) actions, called from the orchestrator; pinned by failing-first tests.
- `UiStateStore` persists in six actions and not in others (panel state survives only by luck); `NetworkSummaryStore.update` computes the DB merge independently of the store merge; `useLoadNetworkSummaries` `forEach(async …)` returns before cache writes land.
- `undoLastEdit` uses render-captured stacks (stale-closure race `postEdit` was already fixed for), has no guard on unknown commands (a stack persisted by a different app version → TypeError, and the stack never pops), and `clearStack` is literally `() => {}`. `undoStackSize: 0` disables the cap, not the feature (`slice(-0)`). **FIXED (round 9):** both dispatchers read latest state via `getState()` (double-undo in one tick works), unknown commands and throwing commands are discarded with a `logHistory` warning instead of wedging the stack, `clearStack` delegates to `deleteStack`, and size 0 disables undo. 6 failing-first tests in the new `useUndoStack.test.tsx` (first direct coverage of the largest previously untested unit).
- Undoing DELETE_COLUMN doesn't restore visual mappings deleted alongside the column (no composite-edit support).
- `deserializeTable`'s "try anyway" fallback yields an *empty* Map for plain-object rows — silent full-table loss for any legacy shape; the `serializeTable` docstring contradicts the implementation.
- `snapshotValidator` `MAX_OBJECT_DEPTH=10` can plausibly reject the app's own undo-stack exports (compounds R2-3); snapshot `Keys` map duplicated from db/index.ts and already missing `AppSettings`.
- Validator misreports missing-target-node errors as "Source id not found"; duplicate node ids: warn-only in validator, silently deduped by cytoscape, kept-last-writer in tables → CX counts and app counts diverge.
- `networkImpl.addNodesWithRows` is a guaranteed no-op (dead branch logic); `createNetworkFromCyjs`/`createFromSif` are stubs returning empty networks; `translateCXEdgeId` duplicated in two files; `translateEdgeIdToCX` blindly `slice(1)`s → non-`e`-prefixed edge id exports as a silently wrong CX id.
- `fetchUrlCx` size limit relies solely on a HEAD `Content-Length` (absent header → unlimited), and does `fetch()` I/O inside the models layer. **PARTIALLY FIXED (round 10):** the limit is now enforced on the actual GET body before parsing (the HEAD check remains as a fast-fail), pinned by the module's first tests (`fetchUrlCxUtil.test.ts`, 0% → covered). The file still lives in models (I/O placement) — cosmetic move left open.
- `useSaveCyNetworkCopyToNDEx` deleteOriginal branch navigates using a stale pre-copy workspace snapshot → single-network workspaces end on the empty route instead of the new copy; back-to-back navigations are silently dropped by urlManager's 300ms throttle.

### Architecture red flags & prospective changes

**A1. The persistence middleware needs to be one thing, not six.** The persist wrapper is copy-pasted across six stores with behavioral drift (sync vs async, extra guards, `void` vs await). All share the `currentNetworkId` defect (R2-2) and the unhandled-rejection defect (R2-5). **Prospective change:** a single shared middleware that (a) persists the slice actually mutated, (b) debounces/coalesces writes per (store, networkId) key, (c) surfaces failures to the message store, (d) sequences delete-vs-put per key (kills the `waitSeconds(1)` hack, R2-12). This is the highest-leverage refactor in the data layer.

**A2. Write amplification is significant and unbounded.** No debounce/throttle anywhere: every renderer click (selection) serializes the *entire* NetworkView (O(n) over 26k elements) and puts it to IDB; every cell edit serializes both full tables; every `postEdit` structuredClones the whole per-network undo stack *twice* (undo + redo set). Main-thread, per-interaction. Selection state arguably shouldn't be persisted at all. Related quadratic: `useDeleteNodes`' `edges.filter(e => existingNodeIds.includes(…))` is O(nodes×edges).

**A3. No cross-store atomicity or ordering.** Workspace/network/tables/views/style/undo are written in separate Dexie transactions at independent times. A crash between `putWorkspaceToDb` and the network/table puts leaves `workspace.networkIds` referencing partial rows — `getCyNetworkFromDb`'s all-optional `CachedNetworkData` exists to paper over exactly this. **Prospective change:** group the per-network save into one Dexie transaction (Dexie supports multi-table transactions natively).

**A4. Network lifecycle has no single orchestrator.** The ~10-store delete cascade was duplicated between `useDeleteCyNetwork` and `networkApi.deleteNetwork` ("mirrors useDeleteCyNetwork"), already disagreeing (currentNetworkId repair, URL, UiState/FilterStore cleanup — both incomplete). The `currentNetworkId ∈ networkIds ∪ {''}` invariant was enforced nowhere.
**Status: FIXED (round 8).** New framework-agnostic [`deleteNetworkOrchestrator`](src/data/hooks/deleteNetworkOrchestrator.ts) (`deleteNetworkFromAllStores` / `deleteAllNetworksFromAllStores`) is the single source of truth: it runs the full cascade (now including UiState + FilterStore cleanup), owns the currentNetworkId invariant, and is called by both `useDeleteCyNetwork` (which adds only URL navigation) and `networkApi`. Any new per-network store must be added in exactly one place. Round-2 analysis correction: `useDeleteCyNetwork` *did* already call `UndoStore.deleteStack` — the R2-10 "deletion flows never call deleteStack" claim applied only to paths that predate that; with round-3's `removeSlice` wiring plus the orchestrator, undo rows are now deleted from IndexedDB on every deletion path.

**A5. Three divergent Map-serialization stacks, one correct.** `mapSerialization.ts` (entries arrays — correct), `exportApplicationState.serializeStoreState` (Maps → objects with `String(key)` — lossy for numeric/boolean keys, and mislabels shared refs as `[Circular Reference]`), raw `JSON.stringify` in snapshot export (Maps → `{}` — R2-6). **Prospective change:** snapshot export should route through the existing domain serializers; delete the other ad-hoc paths.

**A6. Import/export performance.** Import makes ~4 full main-thread passes over up to 100MB (parse → re-stringify just to re-check size/scan for `__proto__` → depth traversal → per-record sanitize deep-copy), then per-record `await put()` instead of `bulkPut`. Export pretty-prints (`JSON.stringify(…, null, 2)`) and `exportApplicationState` parses/re-stringifies the same payload up to three more times. **Prospective change:** single-pass validation, `bulkPut`, no pretty-print, and consider a worker for >10MB payloads.

**A7. Layering violations in models.** `RendererModel/Renderer.ts` imported `ReactElement` from react at runtime; `LayoutModel/impl/layoutSelection.ts` imported from `features/HierarchyViewer` (models → features inversion); `fetchUrlCxUtil.ts` does network I/O inside models; four `console.*` calls in model impls (stripped in prod builds → silent); mutable shared exports in `defaultVisualStyle.ts`.
**Status: mostly fixed (rounds 6/10).** Renderer's React import is now `import type` (erased at compile time — zero runtime dependency); `getDefaultLayout` takes an `isHierarchical` boolean so models no longer import `isHCX` from features (both callers pass `isHCX(summary)`; the test file's features-mock is gone and a hierarchy case was added); all four `console.*` calls in model impls replaced with `logModel` (visualStyleConverter in round 6, customGraphicsImpl + cyJsVisualPropertyConverter in round 10) — `src/models` is now console-free. Remaining (accepted for now): `fetchUrlCxUtil.ts` file placement, mutable `defaultVisualStyle` shared exports (safe while all touchpoints go through Immer).

**A8. CI blind spots.** ~~No `tsc --noEmit` anywhere in `npm test`~~ **Corrected (round 4): `npm test` → `lint` → `lint:tsc` already runs `tsc --noEmit`; the round-2 claim was wrong.** The genuine gaps: the widened enum type made the gate blind to a whole class of bugs (fixed in round 4, R2-22); coverage is not gated; and a test file that fails to *load* reports zero tests rather than failing loudly (observed in round 1). **Prospective change:** add a coverage floor for `src/data/db/**`.

### Store spec quality (round-2 assessment)

Across all 16 store specs there was **not a single assertion that a DB function was called** — every spec mocks `../../db` then ignores the mocks, so persistence (the entire point of the wrappers) was 0% asserted before this round. Specs also hard-mock WorkspaceStore to a fixed `currentNetworkId`, guaranteeing the R2-2 coupling stays invisible. Verdicts: WorkspaceStore/ViewModelStore/TableStore/UiStateStore specs test real invariants (good); NetworkStore/NetworkSummaryStore/FilterStore are happy-path setter smoke; `ViewModelStore.spec.ts` asserts the `getViewModel` bug as spec; `OpaqueAspectStore.spec.ts`'s idb-keyval mock hides R2-4. The best tests in the layer are the hook tests (`useCreateNode`/`useDeleteNodes` et al.) — real cross-store assertions. Entirely untested: `useDeleteCyNetwork`, `urlManager`, `useUndoStack`, the NDEx save/load hooks.

---

## What was done

### Round 1 (validator focus)

- **`src/data/db/validator.test.ts`** (40 tests): contract tests for all 22 DB read-path validators → 0% → 99% stmts.
- **`src/data/db/db.test.ts`** +3 regression tests (workspace selection, app-settings CRUD) → db/index.ts 77.8% → 83%.

### Round 2 (this pass) — 24 new tests, all passing; no production code modified

- **`src/data/hooks/stores/UndoStore.spec.ts`** (11 tests, new): state operations + the first persist-wrapper assertions in the repo. Pins R2-2 (mutating a non-current network persists the current slice; persistence skipped when current has no stack) and the no-DB-delete behavior of `deleteStack` (R2-10), each marked as known defects so fixes are observable.
- **`src/data/db/migrations.test.ts`** (3 tests, new): pins R2-1 both ways — `applyMigrations` is a no-op under the production constructor ordering (even with a migration registered), registers versions correctly when `verno` is below target, and a full seeded-DB integration test proving upgrade functions do run when registration precedes `open()`.
- **`src/data/db/snapshot/fixtureCompat.test.ts`** (6 tests, new): the historical DB snapshot fixtures in `test/fixtures/db-snapshots/` (v1.0.0–v1.0.4, created for backward-compat testing but consumed by nothing) are now imported into the current schema on fake-indexeddb; asserts import success, per-store counts, per-network readability, and workspace identity. All five fixtures import cleanly today.
- **`src/data/db/serialization/immerSerialization.test.ts`** (+4 tests): positive assertions that Maps/Sets/Dates survive the structuredClone path, and pins for the three fallback hazards of R2-9 (Map/Set → `{}`, `_`-key dropping, shared-reference blanking).

### Round 3: test-driven fixes for the P0s

Discipline per AGENTS.md: for each issue a regression test was written first and **shown to fail against the old code** (proving the flaw is impactful), then the fix was applied and the test shown to pass.

**Production changes:**

- **R2-1** — `src/data/db/migrations.ts`: `applyMigrations` (verno-guarded, could never register anything) replaced by synchronous unconditional `registerMigrations`; `db/index.ts` constructor updated.
- **R2-2 / R2-5 / circlePacking-P2** — new shared middleware `src/data/hooks/stores/persistNetworkSlices.ts` (identity-diffs the networkId → slice map after each `set`; persists exactly the changed slices under the mutated network's id; catches + logs failures; optional `removeSlice` for deletions). `TableStore`, `ViewModelStore`, `VisualStyleStore`, `UndoStore` rewired onto it; redundant explicit `add`-time puts removed; ViewModelStore's `putSlice` filters circlePacking views. NetworkStore intentionally not migrated (see R2-2 residual note).
- **R2-3 / R2-8(partial)** — `src/data/db/snapshot/index.ts`: workspace clear moved behind a `clearWorkspace` import option that runs only after parse + validation; file entry point no longer clears eagerly.
- **R2-4** — `OpaqueAspectStore.deleteAll` now calls `clearOpaqueAspectsFromDb()`; `idb-keyval` no longer imported anywhere in `src/` (dependency removable from `package.json` in a follow-up).
- **R2-10 (partial)** — deleted undo stacks now delete their IndexedDB row via `removeSlice`.
- **R2-11 (security)** — `exportApplicationState` no longer serializes the credential store (static redaction placeholder).

**Tests: 14 new + 3 flipped from defect-pins to correct-behavior assertions, 13 of which failed pre-fix:** `migrations.test.ts` (restructured, 4 tests — production-ordering regression + already-declared-version + fresh-install no-op + Dexie mechanics), `snapshot.test.ts` (+2 workspace-preservation), `OpaqueAspectStore.spec.ts` (+2 DB-call assertions), `exportApplicationState.test.ts` (new file, 2 — first coverage of this module; the token test's pre-fix failure diff showed live sentinel tokens inline in the export), `TableStore.spec.ts` (+2), `ViewModelStore.spec.ts` (+2), `VisualStyleStore.spec.ts` (+1), `UndoStore.spec.ts` (persistence suite flipped to intended behavior + DB-deletion assertion). One strict-mode tsc error in a round-2 test also fixed — **`npx tsc --noEmit` is now clean project-wide (0 errors)**, so gating CI on it (A8) is a one-line change away.

**Verification:** full unit suite **148 files / 2192 tests passing** (round 2 baseline: 147/2180); `npx oxlint src/data` clean; `npx tsc --noEmit` → 0 errors.

### Round 4: NetworkStore keying + type-layer exhaustiveness

Same test-first discipline; 6 new tests, 5 of which failed pre-fix.

**Production changes:**

- **R2-2 (closed)** — `NetworkStore.ts`: current-network persist wrapper deleted; every mutating action calls `persistNetwork(get().networks.get(networkId))` with the network it actually mutated (per-action persistence, since in-place cy mutation defeats identity diffing). Failures are caught + logged.
- **R2-22 (closed)** — `as const` on `VisualPropertyValueTypeName`; `valueType2BaseType` deduped (`'boolean'` → `'boolean'`) and completed (`color`/`customGraphic`/`customGraphicPosition`/`nodeLabelPosition`: `null`, preserving current permissions). Enforcement fallout, all latent bugs: `NodeLabelPosition: 'nodeLabelPosition'` added to the enum (it was a real value type used by `defaultVisualStyle` + the Vizmapper renderer map but absent from the enum); `'HorizontalAlign'` normalized to `'horizontalAlign'` (dormant type, lone casing outlier, disagreed with the renderer-map key); 27 dead *name*-keyed entries (`nodeImageChart*`) removed from the Vizmapper *type*-keyed renderer map (unreachable — the map is only indexed by `vp.type`; a separate `vpName2RenderMap` exists for name overrides); `visualStyleApi.test.ts` corrected (`'double'` column type → `'number'` VP type in five `createContinuousMapping` calls).
- **A8 correction** — `npm test` already typechecks (`lint:tsc`); no `package.json` change was needed. The round-2 claim is struck through above.

**Tests:** `NetworkStore.spec.ts` +3 (persistence keying — all failed pre-fix), `mappingFunctionImpl.test.ts` +3 (boolean-VP passthrough over-permission — 2 failed pre-fix).

**Verification:** full unit suite **148 files / 2198 tests passing**; `npx oxlint src` clean; `npx tsc --noEmit` → 0 errors.

### Round 5: snapshot fidelity + model coercion trio

Same test-first discipline; 21 new tests, 16 of which failed pre-fix.

**Production changes:**

- **R2-6 (closed)** — snapshot export/import round-trips Maps, Sets and Dates via tagged JSON (`__cywebType` replacer/reviver, `sanitizeRecord` preserves revived instances). Self-describing: all five legacy backward-compat fixtures still import.
- **R2-7 (closed)** — dexie-observable internal tables (`_changes`, `_syncNodes`, …) excluded from export and ignored on import.
- **R2-8 (closed)** — `clearWorkspace` → `clearExisting`: replace-mode file import clears **all** app stores after validation, matching the UI dialog's "replace all existing data".
- **R2-14 (partial)** — `metadata.formatVersion` stamped (2 = tagged); migration-bypass transform still open.
- **R2-15 (closed)** — blank strings no longer coerce to `0`/`[0]`/`['']`; blank list input → `[]`.
- **R2-16 (partial)** — shared `splitSerializedList`; numeric/boolean lists tolerate `'1,2,3'`; string-list escaping remains an open product decision (lossy case pinned by test).
- **R2-17 (closed)** — `compareNumbers` is a valid comparator; missing values and NaN sort to the bottom in both directions.

**Tests:** `valueTypeImpl.test.ts` +16 (11 failed pre-fix), `snapshot.test.ts` +5 (all failed pre-fix).

**Verification:** full unit suite **148 files / 2219 tests passing**; `npx oxlint src` clean; `npx tsc --noEmit` → 0 errors.

### Round 6: CX validation & conversion hardening

Same test-first discipline; 14 new tests, 13 of which failed pre-fix.

**Production changes:**

- **R2-18 (closed)** — `validateCX2` reports unknown attribute types as validation errors instead of throwing a Zod schema object.
- **R2-19 (closed)** — tableConverter tolerates empty/keyless `attributeDeclarations`; visualStyleConverter skips-and-logs mappings without definitions and malformed bypass entries.
- **R2-20 (closed)** — 2-entry continuous mappings import correctly; gt/lt no longer double-converted; the mapper returns defaults for `null`/`NaN`/non-numeric input. **New bug found by the tests:** the d3 domain excluded the min/max boundary anchors, so mappings with <2 middle control points returned `undefined` for every in-range value — boundaries are now anchors.
- **R2-21 (closed)** — `useCreateNetworkFromCx2` validates external CX2 before conversion; the validation-policy audit now has zero holes.
- A7 partial: `console.debug` in visualStyleConverter → `logModel`.

**Tests:** `validator.test.ts` +2, `tableConverter.test.ts` +2, `visualStyleConverter.test.ts` +4, `mapperFactory.test.ts` +4, `useCreateNetworkFromCx2.test.tsx` (new file, 2).

**Verification:** full unit suite **149 files / 2233 tests passing**; `npx oxlint src` clean; `npx tsc --noEmit` → 0 errors.

### Round 7: db/validator.ts wired into the read path (observe mode)

Decision taken: **wire, don't delete — in observe mode.** Every major `get*FromDb` read now runs its model-shape validator via an `observeValidation` helper that logs a `Read-path validation failed for <label>` warning on mismatch and always returns the data unaltered. This connects round 1's orphaned safety net with zero risk of rejecting legitimate persisted state; enforcement (fail-soft fallbacks or rejection) can be layered on once warnings are quiet in the field.

- Wired reads: workspace (all three found-paths), network, tables (post-deserialization), visual style, network views (each), summaries (single + bulk), UI state, app, service apps (each), opaque aspects, undo stack.
- Schema reconciliation (round-1 P0 precondition): `currentNetworkId` and `activeNetworkView` now accept `''` (legitimate empty-workspace / no-active-view states) via `IdTypeOrEmptySchema`.
- Tests: +2 schema-reconciliation pins in `validator.test.ts`, +3 observe-mode tests in `db.test.ts` (malformed row → warn + data returned; well-formed row → no warn) — all 5 failed pre-fix.

**Verification:** full unit suite **149 files / 2238 tests passing**; `npx oxlint src` clean; `npx tsc --noEmit` → 0 errors.

### Round 8: network-lifecycle orchestrator (A4, R2-13)

Same test-first discipline; 8 new tests (6 in the new `useDeleteCyNetwork.test.tsx` — first coverage of the most consequential cascade in the app — plus 2 in `networkApi.test.ts`), 5 of which failed pre-fix.

**Production changes:**

- New `src/data/hooks/deleteNetworkOrchestrator.ts` — the single source of truth for the deletion cascade, used by both `useDeleteCyNetwork` (now navigation-only on top) and `networkApi.deleteNetwork`/`deleteAllNetworks`.
- Owns the `currentNetworkId ∈ networkIds ∪ {''}` invariant (R2-13): repaired regardless of navigation, untouched when a non-current network is deleted.
- New cleanup actions close the orphan leaks: `UiStateStore.deleteNetworkUiState`/`deleteAllNetworkUiState` (persisted `visualStyleOptions` + `columnUiState`), `FilterStore.deleteNetworkIndex`/`deleteAllNetworkIndexes` (in-memory search indexes) with impl functions in `filterStoreImpl`.
- Deliberate behavior change: deleting a non-current network no longer switches the current network (the old `navigate:true` paths switched to the first remaining network unconditionally).

**Verification:** full unit suite **150 files / 2245 tests passing**; `npx oxlint src` clean; `npx tsc --noEmit` → 0 errors.

### Round 9: undo hardening (B4/B5/B6/B10, R2-10 Safari half)

Same test-first discipline; 7 new tests (6 in the new `useUndoStack.test.tsx` — first direct coverage of the largest previously-untested unit — plus a Safari-safety storage test in `db.test.ts`), 6 of which failed pre-fix.

**Production changes:**

- `useUndoStack`: `undoLastEdit`/`redoLastEdit` now read the latest stacks/target network via `getState()` at execution time (B4 — double-undo in one tick no longer duplicates); unknown persisted commands and commands that throw are discarded with a `logHistory` warning instead of throwing into the click handler and wedging the stack (B5, with the failed edit deliberately not moved to redo); `clearStack` actually clears via `deleteStack` (B6); `undoStackSize: 0` disables undo instead of unbounding it (B10). Stale `exhaustive-deps` entries removed.
- New `serialization/richValues.ts` (`encodeRichValues`/`decodeRichValues`): undo stacks are stored as tagged plain objects (Safari IndexedDB cannot structured-clone Maps) and decoded on read; legacy raw-Map rows decode unchanged, so no migration is needed.

**Verification:** full unit suite **151 files / 2252 tests passing**; `npx oxlint src` clean; `npx tsc --noEmit` → 0 errors.

### Round 10: P2 cluster — getViewModel fix, urlManager tests, fetchUrlCx limit, layering cleanups

14 new tests across two new test files and updated suites.

- **`getViewModel` viewId fix** — matches on `viewId` instead of the network id; the spec assertion that codified the bug was rewritten to intended behavior.
- **`urlManager` first tests** (16.6% → covered): path building, 300ms throttle (documented as deliberate lossy behavior), same-path skip, forced-replace on same-network re-navigation, `updateSearchParams`, singleton reset.
- **`fetchUrlCx` size limit enforced on the GET body** (B15) + first tests for the module, including the no-Content-Length case that previously meant no limit at all.
- **A7 layering**: type-only React import in RendererModel; `getDefaultLayout(numElements, threshold, isHierarchical)` removes the models→features import (callers pass `isHCX(summary)`); `src/models` is now `console.*`-free.

**Verification:** full unit suite **153 files / 2266 tests passing**; `npx oxlint src` clean; `npx tsc --noEmit` → 0 errors.

---

## Consolidated backlog (prioritized)

| Priority | Item | Effort |
| -------- | ---- | ------ |
| ~~P0~~ ✅ | ~~Fix migration registration ordering (R2-1)~~ **Done (round 3).** | — |
| ~~P0~~ ✅ | ~~Fix persist-wrapper keying (R2-2) via shared middleware~~ **Done for Table/ViewModel/VisualStyle/Undo (round 3).** | — |
| ~~P0~~ ✅ | ~~Reorder snapshot import: validate before `workspace.clear()` (R2-3)~~ **Done (round 3).** | — |
| ~~P0~~ ✅ | ~~`OpaqueAspectStore.deleteAll` → `clearOpaqueAspectsFromDb` (R2-4)~~ **Done (round 3);** dropping `idb-keyval` from package.json remains. | — |
| ~~P0~~ ✅ | ~~Redact credentials from `exportApplicationState` (R2-11)~~ **Done (round 3).** | — |
| ~~P0~~ ✅ | ~~NetworkStore persistence keying (R2-2 residual)~~ **Done (round 4)** — per-action persistence. | — |
| ~~P1~~ ✅ | ~~Wire or delete `db/validator.ts`~~ **Done (round 7)** — wired in observe mode with schemas reconciled. Future: escalate to enforcement once warnings are quiet. | — |
| ~~P1~~ ✅ | ~~Snapshot fidelity (R2-6/7/8)~~ **Done (round 5)** via tagged JSON, store filtering, and true replace semantics. R2-14 residual: route imported records through schema migrations once the first real migration ships. | S (residual) |
| ~~P1~~ ✅ | ~~Validate CX2 in `useCreateNetworkFromCx2` (R2-21); `validateCX2` throw-vs-return (R2-18); converter hardening (R2-19)~~ **Done (round 6).** | — |
| ~~P1~~ ✅ | ~~Network-lifecycle orchestrator (A4, R2-13) + `useDeleteCyNetwork` tests~~ **Done (round 8).** | — |
| ~~P1~~ ✅ | ~~valueTypeImpl coercion fixes (R2-15/17)~~ **Done (round 5).** R2-16 residual: decide whether list_of_string needs an escaping scheme for elements containing `', '`. | S (decision) |
| ~~P1~~ ✅ | ~~Undo hardening: Safari-safe Maps, deletion-flow deleteStack, unknown-command guards, stale-closure fix, useUndoStack tests~~ **Done (rounds 8–9).** | — |
| ~~P2~~ ✅ | ~~`as const` on `VisualPropertyValueTypeName` + fix `valueType2BaseType`~~ **Done (round 4).** (The tsc gate already existed — A8 correction.) Open product question: should string→color passthrough be allowed? | — |
| **P2** | Debounce/coalesce persistence; stop persisting selection; Dexie transaction per network save (A2, A3). | M–L |
| ~~P2~~ ✅ | ~~2-entry continuous mappings + mapper null/NaN handling (R2-20)~~ **Done (round 6)**, incl. the newly found domain-anchors bug. | — |
| ~~P2~~ ✅ | ~~`urlManager` tests; `getViewModel` viewId fix; layering cleanups (A7)~~ **Done (round 10)**; `fetchUrlCxUtil` file placement left as cosmetic. | — |
| **P3** | Import/export performance (single-pass validation, bulkPut, worker) (A6); coverage gate for `src/data/db/**`. | M |

---

*Coverage produced with `npx vitest run --coverage --coverage.include='src/data/**/*.ts' --coverage.include='src/models/**/*.ts'`. Scope the `include` globs to `*.ts`/`*.tsx` — a bare `src/models/**` makes v8 try to parse `README.md`/`LICENSE` and aborts report generation.*
