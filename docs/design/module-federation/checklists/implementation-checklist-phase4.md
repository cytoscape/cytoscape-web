# Implementation Checklist — Phase 4: Runtime App Registration

> Track progress for Phase 4. Mark `[x]` when complete. Run verification after each step.
>
> Phase 3 checklist: [implementation-checklist-phase3.md](implementation-checklist-phase3.md)

_Design: [runtime-app-registration-specification.md](../specifications/runtime-app-registration-specification.md) — full spec including manifest loading, state separation, lifecycle state machine, and migration strategy_

**Dependency note:** Requires Phase 2 (App Resource Runtime Registration) to be complete. `AppResourceStore`, `AppCleanupRegistry`, `appLifecycle.ts` (`mountApp`/`unmountApp`/`cleanupAllForApp`), and declarative `resources[]` pattern must all be in place.

---

## Step 0: Decouple the Host Build from the App List

_Design: §6.0, §13 Step 0_

After this step, the host runs with **zero external apps** — this is the expected transitional state until Step 2 restores app loading via the runtime manifest.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `webpack.config.js` | Remove `remotes` config and build-time `apps.json` read |
| `src/data/hooks/stores/useAppManager.ts` | Remove `import appConfig`, top-level `await loadModules()`, module-level state |
| `src/features/AppManager/ExternalComponent.tsx` | Understand `loadModule()`, `loadRemoteEntry()` — these remain unchanged |
| `src/assets/apps.json` | Current manifest format (remains as runtime-fetched file) |

### 0a — Remove webpack remotes configuration

- [ ] Delete the build-time `require(appsJsonPath)` and `APPS_JSON` env var handling (`webpack.config.js:34–37`)
- [ ] Delete `externalAppsConfig` generation loop (`webpack.config.js:38–41`)
- [ ] Delete the `console.log` lines for app config (`webpack.config.js:43–44`)
- [ ] Delete the `remotes: externalAppsConfig` line from `ModuleFederationPlugin` (`webpack.config.js:123`)
- [ ] Keep `exposes` and `shared` configurations unchanged
- [ ] Add `CopyPlugin` pattern to copy `apps.json` to the bundle root so it is served at `/apps.json`:
  ```js
  new CopyPlugin({
    patterns: [{ from: 'src/assets/apps.json', to: '.' }],
  }),
  ```
  This replaces the build-time `require()` with runtime `fetch('/apps.json')` (consumed in Step 2)

#### Verification (0a)

- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] `curl http://localhost:5500/apps.json` returns the manifest JSON

### 0b — Remove runtime appConfig import

- [ ] Remove `import appConfig from '../../../assets/apps.json'` from `useAppManager.ts` (line 12)
- [ ] Remove the derived `const appIds: string[]` array (line 22)
- [ ] Remove the `logApp.info` for app config (line 19)

#### Verification (0b)

- [ ] `npm run build` succeeds (useAppManager no longer references apps.json at import time)

### 0c — Remove top-level await and module-level state

- [ ] Remove the `loadModules()` function definition (lines 33–71)
- [ ] Remove `const loadedApps = await loadModules()` (line 74)
- [ ] Remove `const activatedAppIdSet = new Set<string>(...)` (line 75)
- [ ] Update the lifecycle `useEffect` to no longer reference `loadedApps` or `activatedAppIdSet`
  - Replace the `appIds.forEach(...)` loop (line 186) with a no-op or empty implementation (apps will be loaded dynamically in Step 4)
  - Keep the `restore()` call in the init `useEffect` (line 150), but pass an empty array `[]` for now

#### Verification (0c)

- [ ] `npm run build` succeeds
- [ ] Host starts without top-level `await` blocking module evaluation

### 0d — Convert appRegistry to a dynamic Map

- [ ] Change `appRegistry` from `new Map(loadedApps.map(...))` (lines 79–81) to `new Map<string, CyApp>()`
- [ ] Keep `export const appRegistry` so rendering code can still access it
- [ ] Ensure `unmountAllApps` in the `beforeunload` handler still works with an empty registry

#### Verification (0d)

- [ ] `npm run build` succeeds
- [ ] Host starts and runs correctly with an empty app registry (no external apps, app menu is empty — this is expected)
- [ ] No console errors related to app loading

---

## Step 1: Add Types and Store Fields

_Design: §6.3, §6.4, §6.6, §6.7_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/models/StoreModel/AppStoreModel.ts` | Extend `AppState` and `AppAction` |
| `src/data/hooks/stores/AppStore.ts` | Add new fields and actions to store implementation |
| `src/models/AppModel/AppStatus.ts` | Reference — `AppStatus` semantics do not change |
| `src/data/db/index.ts` | Understand `putAppToDb`, `getAppFromDb`, `deleteAppFromDb` |

### 1.1 — Add AppCatalogEntry, AppLoadState, and ManifestSource types

- [ ] Create `src/models/AppModel/AppCatalogEntry.ts`:
  - `AppCatalogEntry` interface with fields:
    - `id: string` — Module Federation scope name
    - `name?: string` — human-readable display name (falls back to `id`)
    - `url: string` — full remote entry URL
    - `author: string` — developer or organization name (defaults to `"unknown"` after normalization)
    - `description?: string`
    - `version?: string`
    - `tags?: string[]` — category tags for filtering
    - `icon?: string` — URL to app icon image
    - `license?: string` — SPDX license identifier
    - `repository?: string` — source code repository URL
    - `compatibleHostVersions?: string` — semver range of compatible host versions
    - `dependencies?: string[]` — app IDs that must be loaded first (reserved)
- [ ] Create `src/models/AppModel/AppLoadState.ts`:
  - `AppLoadState` type: `'unloaded' | 'loading' | 'loaded' | 'failed'`
- [ ] Create `src/models/AppModel/ManifestSource.ts`:
  - `ManifestSource` type: `{ type: 'url'; url: string } | { type: 'inline'; content: string }`
- [ ] Export all from `src/models/AppModel/` barrel (if one exists) or ensure direct imports work

### 1.2 — Define DEFAULT_MANIFEST_URL constant

- [ ] Create `src/app-api/constants.ts` (or add to an existing constants file):
  - `DEFAULT_MANIFEST_URL = '/apps.json'` — same-origin relative path pointing to the manifest served from the bundle root
  - This URL will be updated to the App Store catalog URL when the App Store is deployed

### 1.3 — Extend AppStoreModel

- [ ] Add to `AppState` in `src/models/StoreModel/AppStoreModel.ts`:
  - `catalog: Record<string, AppCatalogEntry>` — manifest-derived app catalog
  - `loadStates: Record<string, AppLoadState>` — per-app runtime load state
  - `manifestSource?: ManifestSource` — user-configured manifest source (undefined = default URL)
- [ ] Add to `AppAction` in `src/models/StoreModel/AppStoreModel.ts`:
  - `setCatalog: (entries: AppCatalogEntry[]) => void`
  - `setLoadState: (id: string, state: AppLoadState) => void`
  - `setManifestSource: (source: ManifestSource | undefined) => void`
  - `remove: (id: string) => void` — delete `apps[id]`, `loadStates[id]`, and persisted IndexedDB record

### 1.4 — Implement new store actions

- [ ] Add `catalog: {}`, `loadStates: {}`, `manifestSource: undefined` initial state to `useAppStore` in `AppStore.ts`
- [ ] Implement `setCatalog(entries)`:
  - Convert array to `Record<string, AppCatalogEntry>` keyed by `id`
  - Replace entire `catalog` (not merge)
- [ ] Implement `setLoadState(id, state)`:
  - Set `loadStates[id] = state`
- [ ] Implement `setManifestSource(source)`:
  - Set `manifestSource = source`
  - Persist to IndexedDB via `appSettings` object store (see Step 1.6):
    - If `source` is defined, call `putAppSettingToDb('manifestSource', source)`
    - If `source` is `undefined`, call `deleteAppSettingFromDb('manifestSource')`
- [ ] Implement `remove(id)`:
  - Delete `apps[id]`
  - Delete `loadStates[id]`
  - Call `deleteAppFromDb(id)` for IndexedDB cleanup

### 1.5 — Update AppStoreImpl if needed

- [ ] Add corresponding pure functions in `src/models/StoreModel/impl/appStoreImpl.ts` if the existing pattern requires it (AppStore delegates to `AppStoreImpl` for state transformations)

### 1.6 — Add `appSettings` object store and ensure correct persistence boundaries

- [ ] Add `AppSettings` entry to `ObjectStoreNames` in `src/data/db/index.ts`:
  - `AppSettings: 'appSettings'`
- [ ] Add corresponding primary key in `Keys`: `[ObjectStoreNames.AppSettings]: 'key'`
- [ ] Add Dexie table declaration in `CyDB`: `[ObjectStoreNames.AppSettings]!: DxTable<any>`
- [ ] Increment `currentVersion` from `8` to `9` (no data migration needed — Dexie handles new store creation automatically)
- [ ] Add DB helper functions:
  - `putAppSettingToDb(key: string, value: any): Promise<void>`
  - `getAppSettingFromDb(key: string): Promise<any>`
  - `deleteAppSettingFromDb(key: string): Promise<void>`
  - **Failure policy:** `getAppSettingFromDb` callers must catch and treat read failures as non-fatal — log a warning via `logDb.warn` and fall back to `undefined` (use the default manifest URL). A corrupted or inaccessible `appSettings` store must never block startup
- [ ] `manifestSource` is persisted to `appSettings` object store with key `'manifestSource'`
  - On startup, `useAppManager` (not `restore()`) reads `manifestSource` via `getAppSettingFromDb('manifestSource')` and hydrates `AppStore.manifestSource` before resolving the manifest
  - `restore()` only handles app record recovery — it does not read `manifestSource`
- [ ] Verify that `catalog` and `loadStates` are **not** persisted:
  - `catalog` is re-fetched each session from the manifest
  - `loadStates` is session-local and always starts as empty

#### Verification (Step 1)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:unit` passes (no regressions)
- [ ] New fields exist in store but are not yet populated (no behavioral change)

---

## Step 2: Runtime Manifest Fetch and Validation

_Design: §7.1, §7.2, §7.3, §7.4, §7.5, §7.6_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/useAppManager.ts` | Add manifest fetch to startup sequence |
| `src/assets/apps.json` | Current manifest format — backward compatibility target |
| `src/assets/apps.local.json` | Dev manifest format — same structure |

### 2.1 — Implement parseManifest with zod validation

- [ ] Create `src/features/AppManager/manifest/parseManifest.ts`:
  - Define `AppManifestEntrySchema` with zod:
    - `id`: `z.string().regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/).optional()`
    - `name`: `z.string().min(1).optional()`
    - `url`: `z.string().url()`
    - `author`: `z.string().min(1).optional().default('unknown')` (defaults to `"unknown"` for legacy manifests)
    - `description`: `z.string().optional()`
    - `version`: `z.string().optional()`
    - `tags`: `z.array(z.string()).optional()`
    - `icon`: `z.string().url().optional()`
    - `license`: `z.string().optional()`
    - `repository`: `z.string().url().optional()`
    - `compatibleHostVersions`: `z.string().optional()`
    - `dependencies`: `z.array(z.string()).optional()`
    - Refine: either `id` or `name` must be present
  - Define `AppManifestSchema = z.array(AppManifestEntrySchema)`
  - Implement `parseManifest(data: unknown): AppCatalogEntry[]`:
    - If not an array, return empty + warning log
    - Validate each entry independently; skip invalid with warning
    - Normalize: if `id` absent, use `name` as `id` (must match identifier pattern)
    - Deduplicate by `id` (keep first occurrence, warn on duplicates)
    - Warn on self-referencing or unknown `dependencies` (no runtime enforcement)
    - Return normalized `AppCatalogEntry[]`

### 2.2 — Unit tests for parseManifest

- [ ] Create `src/features/AppManager/manifest/parseManifest.test.ts`:
  - Valid manifest with `id`, `url`, and `author` → returns entries
  - Manifest with `name` only (no `id`) → uses `name` as `id` (backward compat)
  - Entry missing `author` → defaults to `"unknown"` (backward compat with legacy `{ name, url }` format)
  - Entry missing both `id` and `name` → skipped
  - Entry with invalid `id` pattern → skipped
  - Entry with invalid `url` → skipped
  - Duplicate `id` → first kept, second skipped
  - Non-array input → returns empty array
  - Empty array → returns empty array
  - Self-referencing `dependencies` → warned and ignored
  - Unknown dependency IDs → warned and ignored
  - Mixed valid/invalid entries → valid entries returned, invalid skipped
  - Optional metadata fields (`tags`, `icon`, `license`, `repository`, `compatibleHostVersions`) → preserved when present, absent when omitted
  - Entry with invalid `icon` URL → skipped
  - Entry with invalid `repository` URL → skipped

### 2.3 — Implement manifest fetch and resolution logic

- [ ] Create `src/features/AppManager/manifest/fetchManifest.ts`:
  - `fetchManifest(url: string): Promise<AppCatalogEntry[]>`:
    - `fetch(url)` without custom cache headers
    - Parse JSON response
    - Call `parseManifest(data)`
    - On network error: log warning, return empty array
    - On JSON parse error: log warning, return empty array
- [ ] Create `src/features/AppManager/manifest/obtainCatalogEntries.ts`:
  - `obtainCatalogEntries(source: ManifestSource | undefined): Promise<AppCatalogEntry[]>`:
    - Source-agnostic resolution:
      - `undefined` or `{ type: 'url' }` → call `fetchManifest(source?.url ?? DEFAULT_MANIFEST_URL)`
      - `{ type: 'inline' }` → call `parseManifest(JSON.parse(source.content))`, catch JSON parse errors
    - This is the **single entry point** for all manifest resolution — callers never call `fetchManifest` or `parseManifest` directly

### 2.4 — Integrate manifest fetch into useAppManager

- [ ] In `useAppManager.ts`, add manifest resolution to the init `useEffect`:
  1. Read `manifestSource` from IndexedDB via `getAppSettingFromDb('manifestSource')` and hydrate `AppStore.manifestSource`
  2. Call `obtainCatalogEntries(manifestSource)` (see Step 2.3b) to resolve the manifest source-agnostically
  3. Call `setCatalog(entries)` with the result
  4. Extract catalog app IDs
  5. Call `restore(catalogAppIds)` — `restore()` only recovers app records, not `manifestSource`
  6. Set `restored = true` after restore completes
- [ ] Add `.catch()` to `restore()` call — restore failure is **non-fatal** (§7.3):
  - Log warning via `logApp.warn`
  - Set `restored = true` to unblock the lifecycle effect
  - Continue with empty restored state (manifest-only catalog, no previously active apps)

#### Verification (Step 2)

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="parseManifest"` passes
- [ ] `npm run build` succeeds
- [ ] Manual test: host fetches `/apps.json` at startup and populates `catalog` in AppStore (verify via React DevTools or debug log)
- [ ] Manual test: if `/apps.json` is unreachable, host starts with empty catalog (no crash)

---

## Step 3: Extract Per-App Loader

_Design: §6.0 Two-Layer Separation, §13 Step 3_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/AppManager/ExternalComponent.tsx` | `loadModule()` — the underlying loader |
| `src/data/hooks/stores/useAppManager.ts` | Where `loadRemoteApp` will be called from |

### 3.1 — Implement loadRemoteApp

- [ ] Create `src/features/AppManager/loader/loadRemoteApp.ts`:
  - `loadRemoteApp(id: string, url: string): Promise<CyApp | undefined>`:
    - Call `loadModule(id, './AppConfig', url)` from `ExternalComponent.tsx`
    - Extract `CyApp` from the default export
    - Validate that `CyApp.id` matches the manifest `id` — if mismatch, log warning, return `undefined`
    - On success: add result to `appRegistry`, return `CyApp`
    - On failure: log warning, return `undefined`
    - No store side effects — only interacts with `ExternalComponent` and `appRegistry`

### 3.2 — Unit tests for loadRemoteApp

- [ ] Create `src/features/AppManager/loader/loadRemoteApp.test.ts`:
  - Mock `loadModule` to return a valid CyApp → returns CyApp, added to `appRegistry`
  - Mock `loadModule` to return undefined → returns undefined
  - Mock `loadModule` to throw → returns undefined, does not throw
  - CyApp.id mismatch with manifest id → returns undefined (rejected)

#### Verification (Step 3)

- [ ] `npm run lint` passes
- [ ] `npm run test:unit -- --testPathPattern="loadRemoteApp"` passes
- [ ] `npm run build` succeeds

---

## Step 4: Selective Startup Loading

_Design: §8.1–§8.5, §9.7 rows 4–5, §13 Step 4_

**Helper placement policy:** In the first rollout, orchestration helpers (`activateAndMount`, `buildPerAppApis`, `processDeclarativeResources`) remain as private functions inside `useAppManager.ts`. Extraction to separate modules is deferred until a second consumer needs them.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/useAppManager.ts` | Orchestrator — add startup auto-load logic |
| `src/data/hooks/stores/appLifecycle.ts` | `mountApp` — called after successful load |
| `src/data/hooks/stores/AppCleanupRegistry.ts` | `cleanupAllForApp` — called on mount failure |

### 4.1 — Implement startup auto-load in useAppManager

- [ ] After `restore(catalogAppIds)` completes:
  1. Read restored apps from `AppStore.apps`
  2. Select apps with `status === AppStatus.Active`
  3. For each selected app:
     - Set `loadStates[id] = 'loading'`
  4. Load all selected apps in parallel via `Promise.allSettled`:
     - Call `loadRemoteApp(id, catalog[id].url)` for each
  5. For each successfully loaded app:
     - Call `registerApp(cyApp)` to add/update in `AppStore.apps`
     - Call `processDeclarativeResources(cyApp)`
     - Build `context` via `{ appId: id, apis: buildPerAppApis(id) }`
     - Call `mountApp(cyApp, context, mountedApps)`
     - Set `loadStates[id] = 'loaded'`
  6. For each failed app:
     - Set `loadStates[id] = 'failed'`
     - Set `AppStatus.Error` (previously active app failed — §9.2)

### 4.2 — Extract activateAndMount helper and rewrite lifecycle useEffect

- [ ] Create an internal `activateAndMount(id: string)` helper inside `useAppManager` (§12.4.2):
  1. Check `mountedApps.has(id)` — if true, return immediately (already mounted)
  2. Check `mountingApps.has(id)` — if true, return immediately (mount in progress)
  3. Add `id` to `mountingApps` (per-app async guard Set, declared as `useRef<Set<string>>`)
  4. Call `registerApp(cyApp)` → `processDeclarativeResources(cyApp)` → build `context` via `{ appId: id, apis: buildPerAppApis(id) }` → `mountApp(cyApp, context, mountedApps)`
  5. Remove `id` from `mountingApps` on completion (success or failure)
- [ ] Both startup auto-load (Step 4.1) and user-initiated activation (Step 5.1) call `activateAndMount`
- [ ] Rewrite the lifecycle `useEffect` to monitor **unmount triggers only**:
  - Apps with `status === AppStatus.Inactive` and `mountedApps.has(id)` → call `unmountApp`
  - The lifecycle effect does **not** initiate mount — this eliminates the race condition where startup and the effect both attempt to mount the same app
  - Remove references to `activatedAppIdSet` and `loadedApps` (deleted in Step 0c)

### 4.3 — Verify startup auto-load is selective

- [ ] Only apps with `AppStatus.Active` in IndexedDB issue remote loading requests
- [ ] Inactive apps in the manifest remain unloaded (`loadStates` stays `'unloaded'`)
- [ ] Apps not in the manifest are not passed to `restore` (orphan records stay in IndexedDB harmlessly)

#### Verification (Step 4)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:unit` passes
- [ ] Manual test: with one app previously active, only that app's `remoteEntry.js` is fetched at startup (check Network tab)
- [ ] Manual test: with an app previously inactive, it is not loaded at startup
- [ ] Manual test: if a remote server is down, the app gets `loadStates = 'failed'` and `AppStatus.Error`; host remains usable

---

## Step 5: User-Initiated In-Page Activation

_Design: §9.1, §9.2, §9.6, §9.7 rows 1–3/7–10, §13 Step 5_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/useAppManager.ts` | Add activation handler |
| `src/data/hooks/stores/AppStore.ts` | `setStatus`, `setLoadState` |

### 5.1 — Implement AppManagerCommands return type

- [ ] Change `useAppManager` signature from `(): void` to `(): AppManagerCommands` (§12.4.1):
  ```typescript
  interface AppManagerCommands {
    activateApp: (id: string) => Promise<void>
    deactivateApp: (id: string) => Promise<void>
    retryApp: (id: string) => Promise<void>
    refreshCatalog: () => Promise<void>
    setManifestSource: (source: ManifestSource | undefined) => void
    removeOrphan: (id: string) => void
  }
  ```
- [ ] UI components (e.g., `AppListPanel`) consume `useAppManager()` and call command functions instead of calling `AppStore.setStatus` directly

### 5.2 — Implement activateApp command

- [ ] Implement `activateApp(id: string)`:
  1. Look up `catalog[id]` for the URL
  2. Check `loadStates[id]`:
     - If `'loaded'` → skip fetch, reuse `appRegistry` entry (fast re-enable path, §9.6)
     - If `'unloaded'` or `'failed'` → proceed with full load
  3. Full load path:
     - Set `loadStates[id] = 'loading'`
     - Call `loadRemoteApp(id, catalog[id].url)`
     - On success: call `activateAndMount(id)` (Step 4.2 helper)
     - Set `AppStatus.Active` and `loadStates[id] = 'loaded'`
  4. Re-enable path (already loaded):
     - Call `activateAndMount(id)`
     - Set `AppStatus.Active`

### 5.3 — Implement activation failure rollback

- [ ] On `loadRemoteApp` failure:
  - Set `loadStates[id] = 'failed'`
  - First-time activation: keep `AppStatus.Inactive` (user can retry via Enable)
  - Existing app (retry): set `AppStatus.Error`
- [ ] On register/resource failure:
  - Call `cleanupAllForApp(id)`
  - Remove `AppStore.apps[id]` only if it did not exist before this attempt
  - Set `loadStates[id] = 'failed'`
- [ ] On `mount()` failure:
  - Call `cleanupAllForApp(id)`
  - Do NOT call `unmount()` (mount did not complete)
  - `AppStore.apps[id]` remains (metadata is valid)
  - Set `loadStates[id] = 'failed'`

### 5.4 — Implement retry logic

- [ ] Retry sets `loadStates[id] = 'loading'` and repeats the full load flow
- [ ] Retry applies to both startup auto-load failures and user-initiated failures
- [ ] Remove the old `failedAppIds` ref-based circuit breaker (replaced by explicit `loadStates`)

#### Verification (Step 5)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:unit` passes
- [ ] Manual test: enable an unloaded app → app loads and activates without page reload
- [ ] Manual test: enable fails (remote server down) → app stays `Inactive`, shows error, can retry
- [ ] Manual test: disable then re-enable an app in same session → no network fetch (fast path)
- [ ] Manual test: retry a failed app → loads successfully on retry

---

## Step 6: Deactivation Cleanup

_Design: §9.4, §9.5, §9.7 rows 6/12, §13 Step 6_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/data/hooks/stores/appLifecycle.ts` | `unmountApp`, `cleanupAllForApp` |
| `src/data/hooks/stores/AppResourceStore.ts` | `removeAllByAppId` — called via cleanup registry |
| `src/data/hooks/stores/ContextMenuItemStore.ts` | `removeAllByAppId` — called via cleanup registry |

### 6.1 — Implement deactivation flow

- [ ] When user disables a loaded app (via `deactivateApp` command):
  1. Persist `AppStatus.Inactive` via `setStatus(id, AppStatus.Inactive)`
  2. Call `unmountApp(cyApp, mountedApps)` — this is the **sole cleanup entry
     point**. `unmountApp` internally calls `cleanupAllForApp(appId)` then the
     app's `unmount()` lifecycle. The orchestrator must **not** call
     `cleanupAllForApp` directly (see §9.4)
- [ ] What is NOT changed:
  - `loadStates[id]` remains `'loaded'` (remote bundle in memory)
  - `AppStore.apps[id]` remains (metadata valid)
  - `appRegistry` entry remains (React.lazy refs usable)

### 6.2 — Ensure deactivation is immediate

- [ ] No page reload required for deactivation
- [ ] App UI (panels, menu items) disappears immediately after cleanup
- [ ] Re-enable after deactivation uses fast path (no network fetch)

#### Verification (Step 6)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test: disable an active app → its panels and menu items disappear immediately
- [ ] Manual test: re-enable the disabled app → appears instantly (no loading spinner)
- [ ] Manual test: disable → re-enable → disable cycle works without errors

---

## Step 7: App Manager UI Updates

_Design: §11.1, §11.2, §11.3, §13 Step 7_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `src/features/AppManager/` | Current app manager panel components |
| `src/features/ToolBar/AppMenu/` | Apps menu rendering |

### 7.1 — Render app manager from catalog

- [ ] Modify app manager panel to use `catalog` as display source:
  - Show all catalog entries (not just loaded apps)
  - For each entry, combine: catalog entry + loaded app record + `loadStates` + `AppStatus`
- [ ] Implement UI states per §11.2:

  | Catalog | Load state | Status | UI action |
  | ------- | ---------- | ------ | --------- |
  | Yes | unloaded | inactive/missing | Enable |
  | Yes | loading | any | Loading indicator |
  | Yes | loaded | active | Disable |
  | Yes | loaded | inactive | Enable (fast) |
  | Yes | failed | any | Retry |
  | No | loaded | active | Disable only (session-only) |
  | No | loaded | inactive | Remove only |
  | No | failed | any | Do not display |

### 7.2 — Implement orphan app handling

- [ ] After catalog refresh, identify apps in `AppStore.apps` but not in `catalog` (orphans)
- [ ] Active orphans: show Disable only (cannot re-enable — no catalog entry)
- [ ] Inactive orphans: show Remove only
- [ ] Remove action:
  - Call `AppStore.remove(id)` → deletes `apps[id]`, `loadStates[id]`, IndexedDB record
  - Call `appRegistry.delete(id)` → removes runtime Map entry
  - App disappears from UI

### 7.3 — Add manifest source controls

- [ ] Display current manifest source (or "Default" when `manifestSource` is `undefined`)
- [ ] Allow entering/editing a custom manifest source URL
- [ ] Allow uploading a manifest file from the local filesystem (§6.5):
  - `<input type="file" accept=".json">` to select file
  - Read via `FileReader.readAsText()`
  - Validate via `parseManifest(JSON.parse(content))`
  - On success: call `setManifestSource({ type: 'inline', content })`
  - On failure: show inline error, do not save
- [ ] Allow clearing custom source to revert to default
- [ ] Custom URL validation (§11.1):
  - Parse with `new URL(input, window.location.origin)`
  - In production: protocol must be `https:`; in dev: `http:` permitted
  - Store resolved absolute URL in `manifestSource` as `{ type: 'url', url }`
  - If validation fails: show inline error, do not save

### 7.4 — Add manual catalog refresh

- [ ] Add refresh button in app manager UI
- [ ] On refresh:
  1. Re-fetch manifest from current effective URL
  2. Validate and normalize via `parseManifest()`
  3. Update `AppStore.catalog`
- [ ] Refresh failure handling (§7.4):
  - Previous catalog is retained (not wiped)
  - Toast or inline error notifies user
  - Already-loaded apps continue running

### 7.5 — Handle currently-loading apps during refresh

- [ ] If a load is in progress when refresh removes the app:
  - Load attempt continues to completion
  - On success: app treated as session-only orphan
  - On failure: failed entry silently discarded (no retry available)

#### Verification (Step 7)

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test: unloaded apps visible in app manager panel
- [ ] Manual test: loaded apps show correct Enable/Disable state
- [ ] Manual test: catalog refresh adds new apps, removes old ones
- [ ] Manual test: orphan apps show correct Disable/Remove actions
- [ ] Manual test: custom manifest source can be set and cleared
- [ ] Manual test: invalid manifest source shows inline validation error
- [ ] Manual test: refresh failure retains previous catalog

---

## Step 8: Preserve Existing Rendering

_Design: §11.3, §13 Step 8_

### 8.1 — Verify Apps menu renders only loaded active apps

- [ ] Apps menu items come from `AppResourceStore` (populated only when apps are loaded and mounted)
- [ ] Unloaded apps do NOT appear in Apps menu
- [ ] No placeholder resources registered for unloaded apps

### 8.2 — Verify panel regions render only loaded active apps

- [ ] Panels come from `AppResourceStore` (populated only when apps are loaded and mounted)
- [ ] Unloaded apps do NOT appear in panel tabs
- [ ] Disabled apps have their panels removed by `cleanupAllForApp`

#### Verification (Step 8)

- [ ] Manual test: with 5 apps in catalog, only 2 active → only 2 appear in Apps menu and panels
- [ ] Manual test: disable an app → its menu items and panels disappear
- [ ] Manual test: enable an unloaded app → its menu items and panels appear

---

## Final Verification

### Build & Test

- [ ] `npm run build` succeeds
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes

### Startup Footprint (§14.1)

- [ ] With many apps in manifest, only persisted active apps issue remote loading requests
- [ ] Network tab shows no `remoteEntry.js` fetches for inactive apps

### Restore Behavior (§14.2)

- [ ] Previously active app + still in manifest → auto-loaded at startup
- [ ] Previously inactive app → remains unloaded until explicitly enabled

### First-Time Activation (§14.3)

- [ ] Enable an unloaded app → dynamically loaded and activated without page reload

### Activation Rollback (§14.4)

- [ ] If activation fails midway, partial resources are cleaned up
- [ ] App does not remain visible as active after failure

### Deactivation Cleanup (§14.5)

- [ ] Disable a loaded app → resources removed, lifecycle unmounted, no page reload

### Manifest Source Override (§14.6)

- [ ] Set custom `manifestSource` (URL or uploaded file) → persisted across sessions
- [ ] Clear `manifestSource` → reverts to default App Store URL

### Failure Isolation (§14.7)

- [ ] Manifest fetch failure → host remains usable, empty catalog
- [ ] Individual app load failure → other apps unaffected

### UI Consistency (§14.8)

- [ ] App manager shows full catalog (loaded + unloaded)
- [ ] Apps menu and panels show only loaded active apps

### Retry (§14.9)

- [ ] Failed app → retryable without page reload

### Re-Enable Fast Path (§14.10)

- [ ] Disable then re-enable in same session → no network fetch

### Catalog Refresh (§14.11)

- [ ] Manual refresh updates catalog without interrupting running apps
- [ ] New apps appear as available; removed apps continue running until session end

### Manifest Validation (§14.12)

- [ ] Invalid entries skipped; valid entries proceed
- [ ] Malformed manifest does not crash the host
