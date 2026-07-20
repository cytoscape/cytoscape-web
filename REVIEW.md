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
5. Round 1's structural finding stands: `db/validator.ts` is a complete, now-tested, 22-function zod validation layer that is **called from nowhere** — DB reads remain unvalidated `any`.

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

**R2-6. Snapshot export is lossy for Maps and Dates.** `exportDatabaseSnapshot` uses raw `JSON.stringify` on `table.toArray()`. The entries-array serializers cover only cyTables/cyVisualStyles/cyNetworkViews/filters. But `undoStacks` records legitimately contain live `Map`s (SET_BYPASS_MAP, MOVE_NODES position maps, DELETE_COLUMN embedding a whole `Table`) → exported as `{}`; `summaries` `creationTime`/`modificationTime` are `Date` → exported as ISO strings and imported back as strings (the commented example migration in `migrations.ts` is direct evidence this mismatch bites). `NaN`/`Infinity` → `null`. Export→import round-trip silently corrupts undo stacks and date fields.

**R2-7. dexie-observable internal tables are exported and re-imported.** Export iterates `db.tables` (includes `_changes`, `_syncNodes`, `_intercomm`, `_uncommittedChanges` — the shipped fixtures confirm `_changes`/`_syncNodes` records). Import does **not** filter to `ObjectStoreNames` (the validator *warns* unknown stores "will be ignored", but the importer imports them): foreign change-log rows and another browser's sync-node records are `put()` into local change-tracking tables, with `rev` collisions and cross-tab replay as plausible consequences. Validator text and importer behavior directly contradict each other.

**R2-8. "Replace" import only replaces `workspace`.** With `merge: false`, only `db.workspace` is cleared; all other stores are merged-by-key. The UI dialog says "This will replace all existing data" — it doesn't; networks absent from the snapshot remain as permanently orphaned rows. The string-based `importDatabaseSnapshot` entry point doesn't clear workspace at all, so the two entry points have different semantics for identical options.

**R2-9. `toPlainObject` fallback silently destroys data.** [immerSerialization.ts:60-96](src/data/db/serialization/immerSerialization.ts:60): when `structuredClone` throws (any function anywhere in the graph), `manualDeepCopy` turns Maps/Sets/Dates into `{}`, drops **all** `_`-prefixed keys, and blanks shared (diamond) references because the visited-set is never unwound. Since `toPlainObject` guards every store persistence path, one stray callback in a persisted object degrades the *entire* object silently. *Pinned by round-2 tests in `immerSerialization.test.ts`.*

**R2-10. Undo stacks orphaned in IndexedDB; Safari hazard.** `UndoStore.deleteStack` only mutated memory — `deleteUndoRedoStackFromDb`/`clearUndoRedoStackFromDb` had zero app callers, so deleted networks' stacks persisted and could rehydrate onto a re-added NDEx network with the same UUID (undo then "restores" a previous session's state). Separately, `putUndoRedoStackToDb` stores Maps raw, violating the repo's own Map-serialization policy (`mapSerialization.ts` documents Safari IDB can't structured-clone Maps) → `DataCloneError` → unhandled rejection (R2-5) on affected Safari versions.
**Status: partially fixed (round 3).** `persistNetworkSlices`'s `removeSlice` hook now deletes the IndexedDB row when a stack is removed from the store (`deleteStack`/`deleteAllStacks`), pinned by the UndoStore spec. Still open: the raw-Map Safari hazard (undo params should go through the entries-array serializers), and network-deletion flows that never call `deleteStack` in the first place.

**R2-11. Debug app-state export leaks auth tokens.** `exportApplicationState.ts` serialized `useCredentialStore.getState()` — including the Keycloak client whose enumerable props contain `token`/`refreshToken`/`idToken` after login — into a JSON file explicitly intended to be shared for debugging. No redaction. *(Security.)*
**Status: FIXED (round 3).** The credential store is no longer serialized at all; the export writes a `[REDACTED: credentials are never exported]` placeholder. Regression test `exportApplicationState.test.ts` seeds the store with sentinel token strings and asserts none appear anywhere in the exported JSON; before the fix the test's failure diff showed the tokens inline in the export. (First test coverage for `exportApplicationState.ts` at all — previously 4.5%.)

**R2-12. Delete-then-re-add races; production papers over it with `waitSeconds(1)`.** Store `delete`/`add` actions fire `deleteXFromDb`/`putXToDb` without awaiting or sequencing per key; `UpdateNetworkDialog.tsx` literally sleeps 1 second between deleting and re-adding the same network id. Slow IndexedDB (large network) → the delete resolves after the re-add's put → the "updated" network vanishes from cache on reload.

**R2-13. `currentNetworkId` can dangle after delete; the invariant is owned by nobody.** `WorkspaceImpl.deleteNetwork` clears it only when the workspace empties. `useDeleteCyNetwork(id, {navigate:false})` leaves it pointing at the deleted network; some UI callers repair it manually, the App API's `networkApi.deleteNetwork` does not. While dangling, workspace persists a broken pointer to DB *and* (per R2-2) all per-network store persistence silently no-ops.

**R2-14. No snapshot format versioning.** `metadata.version` is written on two historically incompatible scales (Dexie `verno` now; native IDB version in older exports/fixtures), never validated, never used to transform records. Once the first real migration ships, snapshot import becomes a migration-bypass channel: old-shape records enter a current-version DB and (per R2-1, even when fixed) upgrade functions will never touch them.

### P1 — model layer & CX pipeline **[runtime-verified where marked]**

**R2-15. Empty/whitespace strings coerce to numbers.** [valueTypeImpl.ts:27-32](src/models/TableModel/impl/valueTypeImpl.ts:27): `!isNaN(+'')` passes (`+'' === 0`). Clearing a numeric cell in TableBrowser writes `0`; clearing a ListInteger cell writes `[0]`; `deserializeValueList(ListString,'')` → `['']` not `[]`. **[verified at runtime]**

**R2-16. `list_of_string` round-trip corruption.** Serialize joins with `', '`, deserialize splits on `', '`: `['a, b','c']` → `'a, b, c'` → `['a','b','c']`. Any element containing `', '` is corrupted the first time the cell is opened. **[verified at runtime]**

**R2-17. `compareNumbers` violates comparator antisymmetry for missing values.** `(a ?? Infinity) - (b ?? -Infinity)` → both orderings of `(5, undefined)` return +∞; sorting numeric columns with missing values is engine-dependent and unstable; NaN cells return NaN. **[verified at runtime]**

**R2-18. `validateCX2` can throw a non-Error.** [validator.ts:327](src/models/CxModel/impl/validator.ts:327): `default: throw z.string()` — `throw` instead of `return`, throwing a ZodString instance. Any CX2 with an unknown attribute-declaration `d` type breaks the "returns ValidationResult" contract; callers reading `error.message` get `undefined`.

**R2-19. CX2 that *passes* validation crashes conversion.** `tableConverter.ts` throws TypeError on `attributeDeclarations: []` or `[{}]` with attributed nodes; `visualStyleConverter.ts` throws on `PASSTHROUGH` without `definition`, malformed bypass `v`. `validateCX2` never inspects `visualProperties`, bypasses, or mapping definitions — "validated" is weaker than what converters assume. Also: `metaData` is required by the validator while converters handle its absence fine.

**R2-20. Valid 2-entry continuous mappings silently discarded on CX import.** `visualStyleConverter.ts:233-298`: the control-point loop iterates only middle entries; with exactly 2 map entries the mapping is dropped with zero diagnostics. Related: gt/lt out-of-range values are double-converted (`:307-312` re-converts already-converted values — latent, breaks for any non-idempotent converter), and the continuous mapper maps `null` → `ltMinVpValue` (should be defaultValue) and `NaN` → `undefined` as a visual property value. **[mapper behavior verified at runtime]**

**R2-21. Validation-policy hole: Module Federation task hook converts unvalidated external CX2.** [useCreateNetworkFromCx2.tsx:75](src/data/task/useCreateNetworkFromCx2.tsx:75) calls the explicitly non-validating `createCyNetworkFromCx2` on external-app-supplied data (exposed as `'./CreateNetworkFromCx2'`). All other entry points (FileUpload, ServiceApps, app-api, NDEx load/query, URL import) were audited and do validate. This is the one real hole vs `EXTERNAL_INPUT_VALIDATION_POLICY.md`. (The policy doc also references two nonexistent paths.)

**R2-22. Type-level exhaustiveness silently disabled.** `VisualPropertyValueTypeName.ts` lacked `as const` → its type widened to `string` → `Record<…>` completeness wasn't checked. Concrete casualty: `valueType2BaseType` had `'boolean'` written twice (`ValueTypeName.Boolean` and `VisualPropertyValueTypeName.Boolean` are the same key; the second write set it to `'string'`, letting any single-value column passthrough-map onto boolean visual properties) and was missing the `'color'`/`'customGraphic'`/`'customGraphicPosition'` keys. **[verified with tsc]**
**Correction to the round-2 claim:** `npm test` **does** typecheck — `test` → `lint` → `lint:tsc` (`tsc --noEmit`) is already wired in `package.json`. The round-2 "CI blind spot" claim was wrong; the gate exists. The real gap was only the widened enum making the gate blind to this class of bug.
**Status: FIXED (round 4).** `as const` added; `valueType2BaseType` corrected (single `'boolean'` entry = `'boolean'`; missing keys added as `null`, preserving current mapping permissions — whether string→color passthrough *should* be allowed remains an open product question). Enforcing the type immediately surfaced and fixed three more latent inconsistencies: (1) 27 dead keys in the Vizmapper type-keyed renderer map that were actually visual property *names* (`nodeImageChart1..9` etc.), unreachable at runtime, removed; (2) the enum value `'HorizontalAlign'` was the lone non-camelCase outlier, disagreeing with the renderer-map key — normalized to `'horizontalAlign'` (no VP anywhere declares this type, so nothing persisted can contain it); (3) `'nodeLabelPosition'` was a real value type used by `defaultVisualStyle` and the renderer map but missing from the enum — added. Also: `visualStyleApi.test.ts` was passing `'double'` (a column type) where a VP value type belongs — corrected to `'number'`. Regression tests: two in `mappingFunctionImpl.test.ts` (number/string column → boolean VP passthrough must be rejected) failed pre-fix.

### P2 — notable (abbreviated)

- `ViewModelStore.getViewModel(networkId, viewModelId)` matches on `view.id` (the network id) instead of `viewId` — a specific secondary view can never be addressed; **the spec codifies the bug** (`ViewModelStore.spec.ts:204-220`). Contract drift: `ViewModelStoreModel`'s `targetViewId` params are unimplemented; `delete` removes all views.
- circlePacking views are excluded from DB in `add` but re-persisted by the wrapper on the next set (any selection click) — the stated intent is defeated. **FIXED (round 3):** the ViewModelStore `putSlice` filters circlePacking views on every write, pinned by "never writes circlePacking views to the DB" in the spec.
- `ViewModelStore.add` mutates its input argument; `TableStore.addRows` is a silent no-op; several TableStore actions crash on missing table while sibling actions null-check; `NetworkStore.moveEdge` emits `UpdateEventType.ADD` and has zero tests; stray `lastModified` in NetworkStore initial state.
- Network deletion leaks per-network `UiStateStore` entries (`visualStyleOptions`, `columnUiState` — both persisted) and `FilterStore` search indexes (in-memory) — in both `useDeleteCyNetwork` *and* its app-api mirror.
- `UiStateStore` persists in six actions and not in others (panel state survives only by luck); `NetworkSummaryStore.update` computes the DB merge independently of the store merge; `useLoadNetworkSummaries` `forEach(async …)` returns before cache writes land.
- `undoLastEdit` uses render-captured stacks (stale-closure race `postEdit` was already fixed for), has no guard on unknown commands (a stack persisted by a different app version → TypeError, and the stack never pops), and `clearStack` is literally `() => {}`. `undoStackSize: 0` disables the cap, not the feature (`slice(-0)`).
- Undoing DELETE_COLUMN doesn't restore visual mappings deleted alongside the column (no composite-edit support).
- `deserializeTable`'s "try anyway" fallback yields an *empty* Map for plain-object rows — silent full-table loss for any legacy shape; the `serializeTable` docstring contradicts the implementation.
- `snapshotValidator` `MAX_OBJECT_DEPTH=10` can plausibly reject the app's own undo-stack exports (compounds R2-3); snapshot `Keys` map duplicated from db/index.ts and already missing `AppSettings`.
- Validator misreports missing-target-node errors as "Source id not found"; duplicate node ids: warn-only in validator, silently deduped by cytoscape, kept-last-writer in tables → CX counts and app counts diverge.
- `networkImpl.addNodesWithRows` is a guaranteed no-op (dead branch logic); `createNetworkFromCyjs`/`createFromSif` are stubs returning empty networks; `translateCXEdgeId` duplicated in two files; `translateEdgeIdToCX` blindly `slice(1)`s → non-`e`-prefixed edge id exports as a silently wrong CX id.
- `fetchUrlCx` size limit relies solely on a HEAD `Content-Length` (absent header → unlimited), and does `fetch()` I/O inside the models layer.
- `useSaveCyNetworkCopyToNDEx` deleteOriginal branch navigates using a stale pre-copy workspace snapshot → single-network workspaces end on the empty route instead of the new copy; back-to-back navigations are silently dropped by urlManager's 300ms throttle.

### Architecture red flags & prospective changes

**A1. The persistence middleware needs to be one thing, not six.** The persist wrapper is copy-pasted across six stores with behavioral drift (sync vs async, extra guards, `void` vs await). All share the `currentNetworkId` defect (R2-2) and the unhandled-rejection defect (R2-5). **Prospective change:** a single shared middleware that (a) persists the slice actually mutated, (b) debounces/coalesces writes per (store, networkId) key, (c) surfaces failures to the message store, (d) sequences delete-vs-put per key (kills the `waitSeconds(1)` hack, R2-12). This is the highest-leverage refactor in the data layer.

**A2. Write amplification is significant and unbounded.** No debounce/throttle anywhere: every renderer click (selection) serializes the *entire* NetworkView (O(n) over 26k elements) and puts it to IDB; every cell edit serializes both full tables; every `postEdit` structuredClones the whole per-network undo stack *twice* (undo + redo set). Main-thread, per-interaction. Selection state arguably shouldn't be persisted at all. Related quadratic: `useDeleteNodes`' `edges.filter(e => existingNodeIds.includes(…))` is O(nodes×edges).

**A3. No cross-store atomicity or ordering.** Workspace/network/tables/views/style/undo are written in separate Dexie transactions at independent times. A crash between `putWorkspaceToDb` and the network/table puts leaves `workspace.networkIds` referencing partial rows — `getCyNetworkFromDb`'s all-optional `CachedNetworkData` exists to paper over exactly this. **Prospective change:** group the per-network save into one Dexie transaction (Dexie supports multi-table transactions natively).

**A4. Network lifecycle has no single orchestrator.** The ~10-store delete cascade is duplicated between `useDeleteCyNetwork` and `networkApi.deleteNetwork` ("mirrors useDeleteCyNetwork"), already disagreeing (currentNetworkId repair, URL, UiState/FilterStore cleanup — both incomplete). The `currentNetworkId ∈ networkIds ∪ {''}` invariant is enforced nowhere. **Prospective change:** a network-lifecycle registry in the pattern of the existing `AppCleanupRegistry` — per-network stores register cleanup handlers; one non-React orchestrator owns the cascade and the invariant, used by both the hook and the App API.

**A5. Three divergent Map-serialization stacks, one correct.** `mapSerialization.ts` (entries arrays — correct), `exportApplicationState.serializeStoreState` (Maps → objects with `String(key)` — lossy for numeric/boolean keys, and mislabels shared refs as `[Circular Reference]`), raw `JSON.stringify` in snapshot export (Maps → `{}` — R2-6). **Prospective change:** snapshot export should route through the existing domain serializers; delete the other ad-hoc paths.

**A6. Import/export performance.** Import makes ~4 full main-thread passes over up to 100MB (parse → re-stringify just to re-check size/scan for `__proto__` → depth traversal → per-record sanitize deep-copy), then per-record `await put()` instead of `bulkPut`. Export pretty-prints (`JSON.stringify(…, null, 2)`) and `exportApplicationState` parses/re-stringifies the same payload up to three more times. **Prospective change:** single-pass validation, `bulkPut`, no pretty-print, and consider a worker for >10MB payloads.

**A7. Layering violations in models.** `RendererModel/Renderer.ts:5` imports `ReactElement` from react (not even `import type`) — violates "Models must NOT import from React". `LayoutModel/impl/layoutSelection.ts` imports from `features/HierarchyViewer` (models → features inversion). `fetchUrlCxUtil.ts` does network I/O, mints uuids, and builds summaries inside models. Four `console.*` calls in model impls (stripped in prod builds → silent). Mutable shared exports in `defaultVisualStyle.ts` are shared by reference across every style.

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
| **P1** | Wire or delete `db/validator.ts` (round 1 P0; reconcile over-strict schemas first). | M |
| **P1** | Snapshot fidelity: route export through domain serializers (Maps/Dates, R2-6), filter dexie-observable tables on import (R2-7), honor "replace" semantics (R2-8), stamp + check a real format version (R2-14). | M |
| **P1** | Validate CX2 in `useCreateNetworkFromCx2` (R2-21); fix `validateCX2` throw-vs-return (R2-18); harden converters against validated-but-hostile shapes (R2-19). | M |
| **P1** | Network-lifecycle orchestrator owning the delete cascade + `currentNetworkId` invariant (A4, R2-13); add `useDeleteCyNetwork` tests. | M–L |
| **P1** | valueTypeImpl coercion fixes (R2-15/16/17) with the failing-first tests listed in round-2 notes. | S–M |
| **P1** | Undo persistence: serialize Maps for Safari (R2-10 residual), call `deleteStack` from network-deletion flows, guard unknown commands, fix stale-closure undo/redo. Then test `useUndoStack` round-trips. | M |
| ~~P2~~ ✅ | ~~`as const` on `VisualPropertyValueTypeName` + fix `valueType2BaseType`~~ **Done (round 4).** (The tsc gate already existed — A8 correction.) Open product question: should string→color passthrough be allowed? | — |
| **P2** | Debounce/coalesce persistence; stop persisting selection; Dexie transaction per network save (A2, A3). | M–L |
| **P2** | 2-entry continuous mappings + mapper null/NaN handling (R2-20). | S–M |
| **P2** | `urlManager` tests; `getViewModel` viewId fix (un-codify the spec'd bug); layering cleanups (A7). | M |
| **P3** | Import/export performance (single-pass validation, bulkPut, worker) (A6); coverage gate for `src/data/db/**`. | M |

---

*Coverage produced with `npx vitest run --coverage --coverage.include='src/data/**/*.ts' --coverage.include='src/models/**/*.ts'`. Scope the `include` globs to `*.ts`/`*.tsx` — a bare `src/models/**` makes v8 try to parse `README.md`/`LICENSE` and aborts report generation.*
