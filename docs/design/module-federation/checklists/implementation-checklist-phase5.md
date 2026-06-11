# Implementation Checklist — Phase 5: Workspace-Scoped App Install & Persistence

> Track progress for Phase 5. Mark `[x]` when complete. Run verification after each step.
>
> Phase 4 checklist: [implementation-checklist-phase4.md](implementation-checklist-phase4.md)

_Design: [workspace-app-install-design.md](../specifications/workspace-app-install-design.md) (Rev. 3) — full spec including the `InstalledApp` model, catalog composition, install/uninstall commands, the URL install intent, trust boundary, runtime migration, App Manager UI, and NDEx Stage 1_

**Dependency note:** Requires Phase 4 (Runtime App Registration) to be complete. `AppStore.catalog`, `obtainCatalogEntries()`, `parseManifest()`, `loadRemoteApp()`, `AppManagerCommands`, and the app lifecycle (`activateApp` → `loadRemoteApp` → `mountApp`) must all be in place.

**Key decisions (Rev. 3)** — all pre-implementation questions are resolved; do not re-litigate during implementation:

| Decision | Resolution |
| -------- | ---------- |
| App state location | All apps (manifest apps included) persist as `InstalledApp` in `workspace.installedApps`; the global `apps` store is no longer written after migration (§6.3, §8.4) |
| Legacy migration | Runtime migration at startup into the current workspace; **no DB version bump** (§10.1) |
| Catalog precedence | Installed entry wins for `source: 'appstore' \| 'snapshot'`; `source: 'manifest'` always follows the manifest (§8.1) |
| Restore activation | Allow-listed origins honor saved Active status; others import inactive with a warning (§9 rule 4, §11.3) |
| Version check | `semver` package (new dependency, approved) against `REACT_APP_VERSION` (§9 rule 3) |
| Allow-list | `appInstallAllowedOrigins: string[]` in `config.json` + automatic localhost allowance in dev (§9 rule 2) |
| Entry validation | Reuse `parseManifest()` unchanged on the one-element manifest array (§7.1) |

---

## Step 0: Dependencies & Configuration Groundwork

_Design: §9 rules 2–3_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `package.json` | Add `semver` dependency |
| `src/assets/config.json` | Add `appInstallAllowedOrigins` key |
| `src/AppConfigContext.ts` | Add the new key to the `AppConfig` type |
| `src/custom.d.ts` | Check whether `REACT_APP_VERSION` is declared for TypeScript |
| `webpack.config.js` | Reference — `REACT_APP_VERSION` injection via `DefinePlugin` (line ~248) |

### 0a — Add semver dependency

- [ ] `npm install semver` (dependencies) and `npm install -D @types/semver`
- [ ] Verify `semver.satisfies('1.0.7', '>=1.0.0')` works in a scratch unit test or REPL

### 0b — Add the allow-list config key

- [ ] Add to `src/assets/config.json`:
  ```json
  "appInstallAllowedOrigins": ["https://apps.cytoscape.org"]
  ```
- [ ] Add `appInstallAllowedOrigins: string[]` to the `AppConfig` type in `src/AppConfigContext.ts` (with a default in the fallback config object if one exists)

### 0c — Host version availability

- [ ] Confirm `REACT_APP_VERSION` is declared for TypeScript (e.g. `declare const REACT_APP_VERSION: string` in `src/custom.d.ts`); add the declaration if missing
- [ ] Confirm the value resolves to `package.json` version at runtime (injected by `DefinePlugin`)

#### Verification (Step 0)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:unit` passes (no regressions)

---

## Step 1: Data Model — InstalledApp & Workspace.installedApps

_Design: §6.1, §6.2, §10.2_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/models/AppModel/InstalledApp.ts` | New file — `InstalledApp` + `AppSource` |
| `src/models/AppModel/index.ts` | Barrel export |
| `src/models/WorkspaceModel/Workspace.ts` | Add `installedApps` field |
| `src/models/StoreModel/WorkspaceStoreModel.ts` | Add action signatures |
| `src/data/hooks/stores/WorkspaceStore.ts` | Implement actions — note the persist wrapper skips writes while `workspace.id === ''` |
| `src/models/WorkspaceModel/impl/workspaceImpl.ts` | Pure implementation functions (model pattern) |

### 1.1 — Create InstalledApp model

- [ ] Create `src/models/AppModel/InstalledApp.ts`:
  - `export type AppSource = 'manifest' | 'appstore' | 'snapshot'`
  - `InstalledApp` interface per §6.1: `entry: AppCatalogEntry`, `status: AppStatus`, `source: AppSource`, `installedAt: string` (ISO timestamp)
- [ ] Export from the `src/models/AppModel/index.ts` barrel

### 1.2 — Extend Workspace model

- [ ] Add `installedApps?: InstalledApp[]` to `src/models/WorkspaceModel/Workspace.ts`
- [ ] No DB schema change and no version bump (§10.1) — the field rides inside the existing `workspace` record via `putWorkspaceToDb`

### 1.3 — WorkspaceStore actions

- [ ] Add to `WorkspaceStore` model type (`src/models/StoreModel/WorkspaceStoreModel.ts`):
  - `addInstalledApp: (app: InstalledApp) => void` — **upsert by `entry.id`** (replaces an existing record with the same id; this is what makes install idempotent)
  - `removeInstalledApp: (id: string) => void`
  - `setInstalledAppStatus: (id: string, status: AppStatus) => void` — no-op with a `logStore.warn` if the id is absent
- [ ] Add pure functions in `src/models/WorkspaceModel/impl/workspaceImpl.ts` following the existing `WorkspaceImpl.*` pattern
- [ ] Implement the actions in `src/data/hooks/stores/WorkspaceStore.ts` delegating to the impl functions; the existing persist wrapper writes through to IndexedDB automatically
- [ ] **Constraint:** these actions must only be called after workspace hydration — the persist wrapper silently skips the write while `workspace.id === ''` (§8.3). Callers are gated in Step 3.

### 1.4 — Unit tests

- [ ] Create/extend the WorkspaceStore spec (`.spec.ts` convention for stores, `renderHook` + `act`):
  - `addInstalledApp` adds a record; calling it again with the same id replaces (no duplicate)
  - `removeInstalledApp` removes by id; unknown id is a safe no-op
  - `setInstalledAppStatus` updates status; unknown id warns and does not throw
  - `installedApps` survives a `toPlainObject` round-trip (persist path)

#### Verification (Step 1)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:unit` passes

---

## Step 2: Trust Boundary Helpers

_Design: §9 rules 1–3_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/AppManager/manifest/parseManifest.ts` | Reused unchanged for entry validation |
| `src/features/AppManager/AppSettingsDialog.tsx` | `validateManifestUrl` — precedent for the localhost allowance |

### 2.1 — Implement the install gate

- [ ] Create `src/features/AppManager/install/installGate.ts` with pure, framework-free functions:
  - `parseSingleEntryManifest(data: unknown): AppCatalogEntry | undefined` — run `parseManifest(data)` unchanged; use the **first** entry, warn if more than one, return `undefined` when empty
  - `isAllowedOrigin(url: string, allowedOrigins: string[]): boolean` — compare `new URL(url).origin` against the configured list; when `window.location.hostname` is `localhost`/`127.0.0.1`, additionally allow localhost origins (same precedent as `validateManifestUrl`); invalid URLs return `false`
  - `isHostCompatible(range: string | undefined): boolean` — `undefined`/empty range → `true`; otherwise `semver.satisfies(REACT_APP_VERSION, range)`; an unparsable range logs a warning and returns `true` (do not brick installs on bad metadata)

### 2.2 — Unit tests

- [ ] Create `src/features/AppManager/install/installGate.test.ts`:
  - Single valid entry → returned; empty array → `undefined`; two entries → first returned with warning
  - Allowed origin exact match → `true`; subdomain/different port → `false`; invalid URL string → `false`
  - localhost origin allowed only when the host itself runs on localhost (mock `window.location`)
  - `isHostCompatible(undefined)` → `true`; satisfied range → `true`; unsatisfied range → `false`; garbage range → `true` with warning

#### Verification (Step 2)

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="installGate"` passes
- [ ] `npm run build` succeeds

---

## Step 3: Catalog Composition & Readiness Gate

_Design: §8.1, §8.2, §8.3 — **highest implementation risk; verify this step before building anything on top**_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/useAppManager.ts` | init sequence, `refreshCatalog`, auto-load pass |
| `src/data/hooks/stores/WorkspaceStore.ts` | `subscribeWithSelector` is available for the hydration wait |
| `src/features/AppShell.tsx` | `initializeAppShell` — where `setWorkspace` happens (~line 377) |
| `src/models/StoreModel/AppStoreModel.ts` | Add `catalogSources` field |
| `src/models/StoreModel/impl/appStoreImpl.ts` | `setCatalog` (full replace — the reason re-merge is required) |

### 3.1 — composeCatalog helper

- [ ] Create `src/features/AppManager/manifest/composeCatalog.ts`:
  - `composeCatalog(manifestEntries: AppCatalogEntry[], installedApps: InstalledApp[]): { entries: AppCatalogEntry[]; sources: Record<string, AppSource> }`
  - Union by `id`; on collision the installed entry wins for `source: 'appstore' | 'snapshot'` (immutable version pin), the manifest entry wins for `source: 'manifest'` (§8.1, resolved O1)
  - Manifest-only ids get `source: 'manifest'` in the sources map
- [ ] Add `catalogSources: Record<string, AppSource>` to `AppState` (`AppStoreModel.ts`) and populate it together with `setCatalog` (extend the action or add `setCatalogSources`) — the App Manager UI consumes this in Step 7

### 3.2 — Readiness gate (workspace hydration before catalog/restore)

- [ ] Implement `waitForWorkspaceHydration(): Promise<void>` — resolve immediately if `useWorkspaceStore.getState().workspace.id !== ''`, otherwise subscribe (via `subscribeWithSelector`) until it becomes non-empty; log via `logApp` if the wait exceeds a sanity timeout (warn only, do not reject)
- [ ] In the `useAppManager` init effect, `await waitForWorkspaceHydration()` **before** `setCatalog`/`restore` so the merged catalog is complete before restore and auto-load (§8.3)
- [ ] Confirm `AppShell`'s `initializeAppShell` still calls `setWorkspace` unconditionally on startup (it is the gate's release)

### 3.3 — Re-merge on every catalog rebuild

- [ ] init: `obtainCatalogEntries()` → `composeCatalog(manifest, workspace.installedApps)` → `setCatalog`
- [ ] `refreshCatalog()`: same composition (read `installedApps` via `useWorkspaceStore.getState()`)
- [ ] Manifest source change (`AppSettingsDialog` → `setManifestSource` → `refreshCatalog`): covered by the same helper — verify no remaining direct `setCatalog(manifestEntriesOnly)` call site (§8.2)

### 3.4 — Auto-load reads installedApps

- [ ] In the startup auto-load pass, derive `activeAppIds` from `workspace.installedApps` (`status === Active && catalog[id] !== undefined`) instead of the DB-restored `apps` records (§8.4); keep the legacy `restore()` read until Step 5 removes the global-store writes

### 3.5 — Unit tests

- [ ] `composeCatalog.test.ts`: manifest-only / installed-only / collision with `appstore` source (installed wins) / collision with `manifest` source (manifest wins) / sources map correctness
- [ ] Init-order test (mock stores): catalog is not set before workspace hydration completes

#### Verification (Step 3)

- [ ] `npm run lint` passes; `npm run build` succeeds; `npm run test:unit` passes
- [ ] Manual test: add a fake `InstalledApp` to the workspace record in IndexedDB (DevTools), reload → the app appears in the App Manager list even though it is absent from `apps.json` (**this is the core P1–P3 fix**)
- [ ] Manual test: press **Refresh** in the App Manager → the installed app does not disappear from the list (§8.2)

---

## Step 4: Runtime Migration of the Legacy `apps` Store

_Design: §10.1_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/db/index.ts` | `getAllAppsFromDb`, `deleteAppFromDb` |
| `src/data/hooks/stores/useAppManager.ts` | Migration call site in the init sequence |

### 4.1 — Implement migrateLegacyApps

- [ ] Create `src/features/AppManager/install/migrateLegacyApps.ts`:
  - Input: the merged catalog (Step 3) — runs **after** the readiness gate and catalog composition, **before** the auto-load pass
  - `getAllAppsFromDb()`; no-op (idempotent) when empty
  - For each legacy record with `catalog[id]`: `addInstalledApp({ entry: catalog[id], status: record.status ?? Inactive, source: 'manifest', installedAt: now })` — skip ids already present in `workspace.installedApps`
  - For records without a resolvable URL: drop (delete only) — pre-migration they already depended on the manifest (§10.1)
  - Delete every processed legacy record via `deleteAppFromDb(id)`
- [ ] Wire the call into the `useAppManager` init sequence
- [ ] Do **not** bump the Dexie version; the emptied `apps` table stays in the schema (§10.1)

### 4.2 — Unit tests

- [ ] `migrateLegacyApps.test.ts` (mock DB helpers): active legacy record + in catalog → migrated with status preserved; not in catalog → deleted, not migrated; already in `installedApps` → skipped; empty DB → no-op; second run → no-op (idempotent)

#### Verification (Step 4)

- [ ] `npm run lint` passes; `npm run test:unit -- --testPathPattern="migrateLegacyApps"` passes; `npm run build` succeeds
- [ ] Manual test: seed a legacy `apps` record (DevTools), reload → record appears in `workspace.installedApps` with `source: 'manifest'`, legacy table is empty, previously Active app auto-loads

---

## Step 5: Install / Uninstall Commands & Status Reconciliation

_Design: §7.1, §7.3, §7.4, §8.4, §12.7_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/useAppManager.ts` | `AppManagerCommands`, `activateApp`, `deactivateApp`, `removeOrphan` |
| `src/data/hooks/stores/AppStore.ts` | `add`/`setStatus`/`remove` currently write to the global `apps` store — writes are removed here |
| `src/features/AppManager/AppManagerCommandsContext.tsx` | No change needed — passes the commands object through |

### 5.1 — installApp command

- [ ] Add to `AppManagerCommands`: `installApp(entry: AppCatalogEntry, opts?: { activate?: boolean }): Promise<void>`
- [ ] Implementation (§7.1):
  1. Gate: `isAllowedOrigin(entry.url, config.appInstallAllowedOrigins)` — reject with a user-visible message on failure; `isHostCompatible(entry.compatibleHostVersions)` — install but force `activate: false` + warning on failure (§9 rule 3)
  2. `WorkspaceStore.addInstalledApp({ entry, status: activate ? Active : Inactive, source: 'appstore', installedAt: now })` (upsert → idempotent)
  3. Re-merge into the catalog (Step 3 helper) so the entry is immediately visible
  4. If `opts.activate`: call the existing `activateApp(id)`

### 5.2 — uninstallApp command

- [ ] Add `uninstallApp(id: string): Promise<void>` (§12.7):
  1. `deactivateApp(id)` if mounted (runs `unmountApp` + cleanup)
  2. `WorkspaceStore.removeInstalledApp(id)`
  3. Remove from the merged catalog (+ `catalogSources`), clear `loadStates[id]`, `appRegistry.delete(id)`
  4. `deleteAppFromDb(id)` for any legacy leftover

### 5.3 — Status reconciliation (§8.4)

- [ ] `activateApp` success → `setInstalledAppStatus(id, Active)`; if no `InstalledApp` record exists yet (manifest app), create one: `addInstalledApp({ entry: catalog[id], status: Active, source: 'manifest', installedAt: now })`
- [ ] `deactivateApp` → `setInstalledAppStatus(id, Inactive)`
- [ ] `activateApp` failure paths that set `AppStatus.Error` → mirror to `setInstalledAppStatus(id, Error)` when a record exists

### 5.4 — Stop writing the global `apps` store

- [ ] Remove `putAppToDb` calls from `AppStore.add` and `AppStore.setStatus` (the durable record is now `workspace.installedApps`; `apps`/`CyApp` stay session-local per §6.3)
- [ ] Replace the `restore()` DB read with seeding from `workspace.installedApps` (build the restored `CyApp` status map from `InstalledApp.status`); keep `getAllAppsFromDb` usage only inside `migrateLegacyApps`
- [ ] Audit remaining writers: `useLoadWorkspace` still writes `putAppToDb` — it is reworked in Step 8; leave a TODO referencing Step 8 if Step 8 is not done in the same PR

### 5.5 — Unit tests

- [ ] installApp: allowed origin persists + merges; disallowed origin rejects and persists nothing; incompatible host version installs inactive with warning; repeated install of the same entry does not duplicate
- [ ] uninstallApp: active app is deactivated, removed from workspace/catalog/loadStates/appRegistry
- [ ] activate/deactivate reconciliation: manifest app gains a `source:'manifest'` record on first activation; status round-trips

#### Verification (Step 5)

- [ ] `npm run lint` passes; `npm run build` succeeds; `npm run test:unit` passes
- [ ] Manual test: install an app via DevTools console (`installApp` through a temporary hook) → appears in list, survives reload, auto-loads if activated
- [ ] Manual test: toggle a manifest app off/on → `workspace.installedApps` reflects the status (DevTools → IndexedDB → `workspace`), no writes to the `apps` table

---

## Step 6: URL-Parameter Install Intent

_Design: §7.2_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/AppShell.tsx` | `initializeAppShell` — insertion point is after `setWorkspace(workspace)` (~line 377); the final `navigate({ search: '' })` already strips all params |
| `src/data/hooks/stores/MessageStore.ts` | `addMessage` for user-visible install errors |

### 6.1 — Consume `?installApp=<manifestUrl>`

- [ ] Define `INSTALL_APP_QUERY_KEY = 'installApp'`
- [ ] In `initializeAppShell`, **after** `setWorkspace(workspace)` (guarantees the persist wrapper accepts writes, §8.3):
  1. `const manifestUrl = search.get(INSTALL_APP_QUERY_KEY)` — skip silently when absent
  2. `fetch(manifestUrl)` → JSON → `parseSingleEntryManifest` (Step 2)
  3. On success: `installApp(entry, { activate: true })` — the App Store **Install** button implies activation (§7.3 typical UX); the §9 gate inside `installApp` still applies and downgrades to inactive on version incompatibility
  4. On any failure (fetch error, invalid manifest, disallowed origin): `addMessage` with `MessageSeverity.ERROR`; never throw — AppShell init must continue
- [ ] Confirm the param is removed by the existing `navigate({ pathname, search: '' }, { replace: true })` at the end of init (no extra strip logic needed)
- [ ] Idempotency: re-opening the same intent URL must not duplicate the entry (covered by `addInstalledApp` upsert — verify, don't assume)

#### Verification (Step 6)

- [ ] `npm run lint` passes; `npm run build` succeeds
- [ ] Manual test: open `http://localhost:5500/?installApp=<url-encoded manifest URL>` (serve a single-entry manifest from a localhost dev server) → app installs, activates, URL param disappears
- [ ] Manual test: same URL again → no duplicate row, no error
- [ ] Manual test: manifest URL on a non-allow-listed origin (e.g. a tunnel URL) → error message shown, nothing persisted
- [ ] Manual test: unreachable manifest URL → error message, app shell loads normally

---

## Step 7: App Manager UI — Source Chip, Uninstall, Install from URL

_Design: §12 (mock in §12 intro), §12.2–§12.8_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/AppManager/AppListPanel.tsx` | `AppDisplayEntry`, `getAction()`, row rendering |
| `src/features/AppManager/AppSettingsDialog.tsx` | Apps tab — Install from URL placement (distinct from Manifest Source) |
| `docs/design/module-federation/specifications/workspace-app-install-design.md` §12 | Target dialog mock and row layout |

### 7.1 — Display entry metadata

- [ ] Extend `AppDisplayEntry` with `source?: AppSource` and `removable: boolean` (from `catalogSources`; §12.3: removable ⇔ `source === 'appstore' | 'snapshot'`; legacy orphans keep the existing remove path)
- [ ] Split `getAction()` into a primary-action selector (existing toggle/retry/spinner logic, unchanged) and a `removable` predicate (§12.6)

### 7.2 — Overflow (kebab) menu + uninstall confirmation

- [ ] Add a kebab `IconButton` + MUI `Menu` rendered **only** for removable rows (§12.4); menu item: `Uninstall`
- [ ] Confirmation dialog (§12.5): "Uninstall **{name}**? It will be removed from this workspace." — confirm calls `uninstallApp(id)`, cancel is a no-op; legacy orphan delete stays unconfirmed
- [ ] Add an `App Store` indicator `Chip` on installed (non-manifest) rows (§12.4)
- [ ] `Uninstall` works for both active and inactive rows (active is deactivated first — handled inside `uninstallApp`)

### 7.3 — Install from URL (§12.8)

- [ ] Add an **Install from URL** section to the Apps tab in `AppSettingsDialog`, visually distinct from the existing Manifest Source accordion (see the §12 mock): `TextField` (single-entry manifest URL) + `Install` button
- [ ] On Install: fetch → `parseSingleEntryManifest` → `installApp(entry, { activate: false })` (§12.8: manual installs arrive inactive)
- [ ] Inline error display for: invalid manifest, disallowed origin (no warning-and-proceed bypass), incompatible host version, network failure
- [ ] Clear the field on success; the new row appears immediately (catalog re-merge from Step 5)

### 7.4 — Test hooks

- [ ] Add `data-testid` attributes for the kebab button, uninstall menu item, confirmation dialog buttons, Install from URL field/button (E2E convention)

#### Verification (Step 7)

- [ ] `npm run lint` passes; `npm run build` succeeds; `npm run test:unit` passes
- [ ] Manual test: manifest row → toggle only, no kebab, no chip
- [ ] Manual test: installed row → chip + kebab; Uninstall shows confirmation; cancel leaves the app; confirm removes it and it does not reappear after reload (§15)
- [ ] Manual test: uninstall an **active** app → unmounts (panels/menu items disappear), then removed
- [ ] Manual test: Install from URL with a valid single-entry manifest → row appears inactive; enabling it loads the remote
- [ ] Manual test: Install from URL with a disallowed origin → inline error, nothing persisted

---

## Step 8: NDEx Integration (Stage 1)

_Design: §11.1, §11.3_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/external-api/ndex/workspace.ts` | `createNdexWorkspace` / `updateNdexWorkspace` — extend the `workspaceData.options` type |
| `src/data/hooks/useSaveWorkspaceToNDEx.ts` | Save path — `options` construction (~line 168) |
| `src/data/hooks/useLoadWorkspace.ts` | Restore path — `RemoteWorkspace.options`, app status application |
| `src/data/hooks/useLoadWorkspace.test.ts` | Existing tests to extend |

**Precondition (verify before coding):** the NDEx server persists workspace `options` as opaque JSON — save a workspace with an extra test key against `dev1.ndexbio.org` and read it back (§11.1).

- [ ] Precondition verified

### 8.1 — Save: write `options.installedApps`

- [ ] Extend the `workspaceData.options` type in `src/data/external-api/ndex/workspace.ts` with `installedApps: InstalledApp[]`
- [ ] In `useSaveWorkspaceToNDEx`: populate `options.installedApps` from `workspace.installedApps`; compute `activeApps` from `installedApps` entries with `status === 'active'` (backward compatibility for older hosts, §11.1) — remove the dependency on the global `apps` argument

### 8.2 — Restore: import through the gate with §11.3 activation

- [ ] Extend `RemoteWorkspace.options` in `useLoadWorkspace.ts` with `installedApps?: InstalledApp[]`
- [ ] For each restored entry: re-validate via the §9 gate (`parseManifest`-equivalent schema on `entry`, `isAllowedOrigin`, `isHostCompatible`); failing entries are reported (message) and skipped
- [ ] Allow-listed entries: import into the restored workspace's `installedApps` as `source: 'snapshot'` **keeping the saved status** (Active apps auto-load after the post-restore reload, §11.3)
- [ ] Non-allow-listed entries: import as `status: 'inactive'` + warning message
- [ ] Legacy workspaces (no `options.installedApps`): keep today's `activeApps` behavior unchanged; remove/replace the legacy `putAppToDb` status writes consistently with Step 5.4
- [ ] Write the assembled `installedApps` into the `Workspace` object **before** `putWorkspaceToDb(workspace)` (the restore flow clears the DB and reloads the page; the normal startup path then auto-loads from the workspace record)

### 8.3 — Tests

- [ ] Extend `useLoadWorkspace.test.ts`: workspace with `options.installedApps` (allow-listed, Active) → imported with Active status; non-allow-listed entry → imported inactive + reported; invalid entry → skipped; legacy `activeApps`-only workspace → unchanged behavior
- [ ] Save-path test: `options.installedApps` serialized; `activeApps` derived from installedApps

#### Verification (Step 8)

- [ ] `npm run lint` passes; `npm run build` succeeds; `npm run test:unit` passes
- [ ] Manual test (against `dev1.ndexbio.org`): save a workspace containing an App Store-installed Active app → load it after clearing the local DB → the app is restored with its URL and auto-loads (§15)
- [ ] Manual test: legacy workspace saved before this change still loads with today's behavior

---

## Final Verification

### Build & Test

- [ ] `npm run build` succeeds
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:e2e` passes (update affected App Manager E2E specs)

### Acceptance Scenarios (§15)

- [ ] Installing an app not present in `apps.json` persists it in `workspace.installedApps`; after reload it appears in the available-app list and (if Active) auto-loads
- [ ] Installing with `activate: true` loads and mounts immediately; with `activate: false` the app is listed but not executed
- [ ] An install intent whose `entry.url` is outside the origin allow-list is rejected and not persisted
- [ ] A workspace snapshot restores the installed list; allow-listed entries keep their saved status (Active ones auto-load), non-allow-listed entries arrive inactive with a warning
- [ ] Re-running the same `?installApp=…` intent does not create a duplicate entry
- [ ] Uninstalling an active app unmounts it, removes it from the workspace, and it does not reappear after reload
- [ ] The overflow menu's `Uninstall` is shown only for workspace-installed rows; manifest rows expose the toggle only
- [ ] Selecting `Uninstall` shows a confirmation dialog; cancelling leaves the app installed
- [ ] Install from URL installs exactly as the `?installApp=` intent would; a non-allow-listed origin is rejected with an explanatory error
- [ ] **Refresh** (or a manifest-source change) re-merges `workspace.installedApps`; installed apps never disappear from the list
- [ ] Saving to NDEx writes `options.installedApps` (with `activeApps` still included); restoring on another device imports through the §9 gate with §11.3 activation; legacy `activeApps`-only workspaces behave exactly as today
- [ ] Apps loaded from `apps.json` continue to behave exactly as before
- [ ] Legacy global `apps` records are migrated into the current workspace at first startup and the `apps` table is no longer written
