# Runtime App Registration Specification

- **Rev. 6 (3/23/2026): Keiichiro ONO and Claude** — `author` field relaxed from required to optional with `"unknown"` default for backward compatibility with legacy `{ name, url }` manifests (§6.4, §7.1)
- **Rev. 5 (3/20/2026): Keiichiro ONO and Claude** — Manifest schema extension for App Store readiness: added `author` (required), `tags`, `icon`, `license`, `repository`, `compatibleHostVersions` fields to `AppCatalogEntry` (§6.4) and `AppManifestEntrySchema` (§7.1)
- **Rev. 4 (3/19/2026): Keiichiro ONO, GitHub Copilot, and Claude** — Second code review round: `manifestSource` hydration responsibility unified to `useAppManager` (§7.2); state transition table cleanup calls updated to use `unmountApp` (§9.7 rows 6/12); `obtainCatalogEntries` introduced as source-agnostic manifest resolution entry point (§7.2); remaining `manifestUrl` naming remnants fixed throughout
- **Rev. 3 (3/19/2026): Keiichiro ONO, GitHub Copilot, and Claude** — Responsibility boundary fixes: cleanup ownership consolidated to `unmountApp` (§9.4), restore failure policy added (§7.3), command surface and mount ownership rule added (§12.4.1, §12.4.2). `manifestUrl` generalized to `manifestSource` with inline (file upload) support (§6.5); persistence moved to IndexedDB `appSettings` store (§6.7); multi-source manifest merging added to Non-Goals (§5)
- Rev. 2 (3/19/2026): Keiichiro ONO, GitHub Copilot, and Claude — Codebase audit and comprehensive redesign: webpack remotes removal, two-layer loader/orchestrator separation, zod manifest validation, security considerations, detailed migration strategy. Multiple code review rounds addressing state consistency, failure handling, orphan lifecycle, validation policies, and concurrency design
- Rev. 1 (3/19/2026): Keiichiro ONO, GitHub Copilot, and Claude

Detailed design for runtime-configurable external app registration and selective
loading.

### See Also

| Document | Defines |
| --- | --- |
| [app-api-specification.md](./app-api-specification.md) | Public App API surface (`useElementApi`, `useNetworkApi`, …) and `ApiResult<T>` contract |
| [event-bus-specification.md](./event-bus-specification.md) | `CyWebEvents` types, store-to-event mappings, and subscription lifecycle |
| [app-resource-registration-minimal-app.md](../examples/app-resource-registration-minimal-app.md) | Minimal app example showing declarative `resources[]` and `AppResourceStore` usage |
| [app-store-design.md](./app-store-design.md) | App Store submission flow, review policy, and catalog publishing |
| [phase0-shared-types-design.md](./phase0-shared-types-design.md) | `@cytoscape-web/api-types` package and Phase 0 type design |
| [module-federation-design.md](../module-federation-design.md) | Broader Module Federation roadmap and phase plan |
| [module-federation-audit.md](../module-federation-audit.md) | Audit of current build-time limitations this spec addresses |

---

## 1. Overview

Today, the host can already load remote modules dynamically, but external app
registration is still partly build-time driven and startup still assumes eager
app loading.

This specification covers Module Federation apps only. Service Apps
(REST-based `ServiceApp`) are an independent mechanism and are not affected by
this design.

This specification introduces a runtime-first model. The fundamental
requirement is:

- **Eliminate all build-time dependencies on a static app list.** The host
  build must have zero knowledge of which external apps exist, their URLs, or
  their count. All app discovery must happen at runtime via manifest fetch.

Additional goals:

- Load the app manifest at runtime
- Use a Cytoscape Web App Store manifest as the default catalog source
- Allow users to override the manifest source with their own custom catalog URL
- Avoid rebuilding the host when the app list or remote URLs change
- Avoid loading every app listed in the manifest at startup
- Auto-load only apps persisted as active
- Keep inactive or never-used apps visible in the UI without increasing startup
  footprint
- Keep app state consistent across restore, enable, disable, failure, and retry

### 1.1 Planned Deployment Scenario

The intended rollout assumes this operational flow:

1. A separate Cytoscape Web App Store accepts third-party app registrations
2. The App Store publishes a manifest containing remote entry URLs and app metadata
3. Cytoscape reads that manifest at startup
4. Users choose which apps to enable in the host UI
5. On first enable, the host dynamically loads and activates the app in the current page
6. On later startups, the host auto-loads only the previously enabled apps
7. When a loaded app is deactivated, the host runs cleanup and unmounts it immediately

This rollout treats first-time activation and subsequent activation the same way:
the host dynamically loads the app in the current page, then persists the
active state for future startups.

## 2. Current Behavior

### 2.1 App Discovery

The host reads the app list from apps.json at two separate points:

1. **Build time** — `webpack.config.js` reads apps.json and populates
   `ModuleFederationPlugin.remotes` with static `name@url` entries. This
   hardcodes the available remotes into the webpack build.
2. **Runtime** — `useAppManager.ts` imports apps.json via a webpack alias and
   uses the entries to drive dynamic `<script>` tag injection through
   `ExternalComponent.tsx`.

The build-time `remotes` configuration is redundant because
`ExternalComponent.tsx` already loads remote containers independently via
dynamic `<script>` injection and `window[scope]` lookup, without relying on
webpack's `remotes` resolution.

### 2.2 App Loading

The host currently loads external apps eagerly in useAppManager.ts:

1. Read the configured app list
2. Load each remote AppConfig via top-level `await loadModules()`
3. Build the in-memory app registry
4. Register loaded apps in AppStore
5. Mount or unmount apps based on persisted status

The `loadModules()` call is a module-level top-level await, meaning all remote
entries are fetched as soon as `useAppManager.ts` is first imported. The results
are stored in module-level variables (`loadedApps`, `activatedAppIdSet`,
`appRegistry`) that are fixed at import time. This means:

- Startup cost scales with manifest size rather than actual app usage
- Apps discovered after the initial import cannot be added to the registry
- There is no per-app loading entry point that can be called on demand

### 2.3 Rendering

The host renders plugin-owned UI only from loaded app objects:

- Apps menu items come from loaded app resources or loaded CyApp metadata
- Panels come from loaded app resources or loaded CyApp metadata

Unloaded apps do not contribute UI resources.

## 3. Problem Statement

The current eager-loading model has these limitations:

1. Startup cost increases as the manifest grows
2. Inactive apps still contribute remote loading overhead
3. The host cannot distinguish available apps from loaded apps
4. Runtime loading progress is not represented explicitly in store state
5. UI state and loading orchestration are split across multiple implicit sources
6. The manifest source is not modeled explicitly, even though the deployment
   scenario requires a default App Store catalog and a user override path
7. The desired first-time activation flow is dynamic, but the current design
   does not define the load, mount, and rollback behavior explicitly
8. `ModuleFederationPlugin.remotes` is populated at build time from apps.json,
   tying the available app list to the host build. This is redundant because
   `ExternalComponent.tsx` already performs dynamic loading independently

The host should support a model where the manifest defines the available app
catalog, while actual app loading happens only when needed.

## 4. Goals

- Make external app registration fully runtime-configurable
- Keep the external app catalog in host state
- Load only persisted active apps at startup
- Allow unloaded apps to remain visible in the app manager UI
- Track runtime load progress explicitly
- Support a default App Store manifest source plus a user-configured override
- Support first-time enable via in-page dynamic load and activation
- Support immediate cleanup and unmount when a loaded app is deactivated
- Preserve the existing rendering model for loaded apps
- Minimize regression risk in AppMenu and panel rendering

## 5. Non-Goals

- No live manifest polling in the first rollout (manual refresh is supported)
- No automatic unloading of already-fetched remote bundles from browser memory
- No change to the meaning of AppStatus
- No redesign of Apps menu or panel rendering beyond what is required for
  selective loading
- No dependency resolution between apps in the first rollout. The
  `dependencies` field is defined in `AppCatalogEntry` for forward
  compatibility but the host does not enforce load ordering, auto-load
  dependent apps, or prevent deactivation of depended-upon apps
- No changes to Service Apps (REST-based `ServiceApp` in `AppStore`). Service
  Apps are a separate mechanism with their own discovery, registration, and
  execution model. This specification covers only Module Federation apps
- No multi-source manifest merging. The host uses a single manifest source at
  a time (default App Store URL, custom URL, or uploaded file). Users who need
  apps from multiple catalogs can merge the JSON arrays manually and supply
  the combined file as a single manifest — the format is a plain JSON array
  that supports straightforward concatenation

## 6. Proposed Design

### 6.0 Remote Loading Strategy

Remove `ModuleFederationPlugin.remotes` from `webpack.config.js` entirely. All
remote module loading will use the dynamic loader in `ExternalComponent.tsx`,
which injects `<script>` tags at runtime and resolves containers via
`window[scope]`.

This is not a custom mechanism — it is the standard Dynamic Remote pattern
provided by webpack Module Federation. The low-level container API
(`__webpack_init_sharing__`, `container.init`, `container.get`) is the
officially supported approach for loading remotes whose URLs are not known at
build time. The static `remotes` configuration being removed is merely a
convenience shorthand; the dynamic API is equally first-class.

This means:

- The host build has zero knowledge of which external apps exist
- `apps.json` is no longer read at build time by webpack
- The `useAppManager.ts` top-level `await loadModules()` is removed; module
  loading is triggered on demand (at startup for persisted active apps, or on
  user-initiated enable)
- The module-level variables (`loadedApps`, `activatedAppIdSet`) are removed;
  `appRegistry` becomes a dynamically growing Map managed by the orchestrator
- `ExternalComponent.tsx`'s `loadRemoteEntry()` and `initAndGetModule()`
  remain the sole mechanism for fetching and initializing remote containers

The `ModuleFederationPlugin.exposes` and `shared` configurations are unchanged;
only `remotes` is removed.

#### Two-Layer Separation

The current `useAppManager.ts` mixes remote module fetching with lifecycle
orchestration. This design separates them into two layers:

**Layer 1 — Per-app loader (pure async function, no store side effects):**

```typescript
async function loadRemoteApp(
  id: string,
  url: string,
): Promise<CyApp | undefined>
```

- Calls `ExternalComponent.loadModule(id, './AppConfig', url)`
- On success, adds the result to `appRegistry` and returns the `CyApp` object
- On failure, returns `undefined`
- Has no knowledge of stores, status, or lifecycle

This is equivalent to a single iteration of the current `loadModules()` loop.

**Layer 2 — Orchestrator (useAppManager):**

- At startup: reads `catalog`, selects apps with persisted `Active` status,
  calls `loadRemoteApp` for each, then runs register → resources → mount
- On user enable: calls `loadRemoteApp` for one app, then runs the same
  register → resources → mount sequence
- On user disable: runs cleanup → unmount
- Updates `loadStates` before and after each load attempt

Because the per-app loader is a standalone function, future enhancements (such
as dependency-ordered loading) can be added by controlling the order in which
the orchestrator calls `loadRemoteApp`, without changing the loader itself.

### 6.1 State Separation

The host distinguishes four different concerns:

| Concern               | Store field      | Meaning                                                  |
| --------------------- | ---------------- | -------------------------------------------------------- |
| Manifest source       | manifestSource   | User-configured catalog source (undefined = default URL) |
| Available apps        | catalog          | All apps declared by the runtime manifest                |
| Loaded apps           | apps             | Apps whose remote module has been fetched and registered |
| Runtime load progress | loadStates       | Per-app loading state in the current session             |

This keeps manifest selection, manifest availability, loaded code, and user
intent separate.

### 6.2 AppStatus Semantics

AppStatus keeps its current meaning:

- `AppStatus.Active` (persisted value: `'active'`)
- `AppStatus.Inactive` (persisted value: `'inactive'`)
- `AppStatus.Error` (persisted value: `'error'`)

This document uses enum member names (`AppStatus.Active`, etc.) to refer to
status values. The corresponding persisted string values are stored in
IndexedDB as defined in `AppStatus.ts`.

AppStatus represents user intent and persisted activation state.

It does not represent whether the app has already been loaded in the current
session.

### 6.3 Load State Semantics

Add a separate runtime load-state type:

```typescript
type AppLoadState = 'unloaded' | 'loading' | 'loaded' | 'failed'
```

`AppLoadState` tracks whether the remote JavaScript module has been fetched and
is available in memory. It is orthogonal to `AppStatus`:

- `unloaded` — remote entry has never been fetched in this session
- `loading` — fetch is in progress
- `loaded` — remote module is available in memory (regardless of `AppStatus`)
- `failed` — fetch was attempted and failed

Deactivating an app does **not** change its load state. A `loaded` app that is
set to `Inactive` remains `loaded` because the remote bundle is still in
browser memory. This enables fast re-activation without a network round-trip.

This state is session-local and is not persisted.

### 6.4 Catalog Entry Type

Add a manifest-derived catalog type:

```typescript
interface AppCatalogEntry {
  id: string            // Module Federation scope name (= CyApp.id = window[id])
  name?: string         // Human-readable display name (falls back to id)
  url: string           // Full remote entry URL
  author: string        // Developer or organization name (defaults to "unknown" if absent)
  description?: string
  version?: string
  tags?: string[]       // Category tags for filtering (e.g., ["network-analysis", "layout"])
  icon?: string         // URL to app icon image
  license?: string      // SPDX license identifier (e.g., "MIT", "Apache-2.0")
  repository?: string   // Source code repository URL (e.g., GitHub)
  compatibleHostVersions?: string // Semver range of compatible host versions (e.g., ">=1.0.0")
  dependencies?: string[] // App IDs that must be loaded before this app (reserved)
}
```

The `dependencies` field declares which other apps must be loaded before this
app can be activated. **First-rollout semantics:** this field is accepted and
stored but has no effect on runtime behavior. Specifically:

- The host does not perform dependency resolution or topological ordering
- Unknown dependency IDs (not in catalog) produce a warning and are ignored
- Self-dependencies and duplicate entries produce a warning and are ignored
- Dependencies are not displayed in the app manager UI
- No activation or deactivation is blocked by dependency state

The field is reserved for future use.

`id` is the Module Federation scope name and serves as the unique key in
`catalog`. It maps directly to `CyApp.id` and to `window[id]` at runtime.
Because `id` is used as a JavaScript property key on `window`, it must be a
valid JavaScript identifier. The allowed pattern is:

```
/^[a-zA-Z_$][a-zA-Z0-9_$]*$/
```

`name` is the optional human-readable display name shown in the app manager
UI; when omitted, the host uses `id` as the display name. `name` has no format
restrictions. The two fields have distinct responsibilities:

- `id` — runtime key (scope name, store key, `window` property). Immutable
  after registration.
- `name` — display label. May contain spaces, Unicode, or any human-readable
  text.

After loading a remote module, the host compares the exported `CyApp.id` with
the manifest's `id`. If they do not match, the app is rejected with a warning
log and treated as a load failure.

### 6.5 Manifest Source

The host supports three manifest source modes:

```typescript
type ManifestSource =
  | { type: 'url'; url: string }        // Custom URL (fetch at startup)
  | { type: 'inline'; content: string } // Uploaded file (raw JSON string)
  // undefined = use DEFAULT_MANIFEST_URL
```

The host resolves the manifest as follows:

- If `manifestSource` is `undefined`, the host fetches from
  `DEFAULT_MANIFEST_URL` (initially `/apps.json` — a same-origin path
  served from the bundle root via `CopyPlugin`; will be updated to the
  App Store catalog URL when the App Store is deployed). Defined in
  `src/app-api/constants.ts`
- If `manifestSource.type === 'url'`, the host fetches from the custom URL
- If `manifestSource.type === 'inline'`, the host parses the stored JSON
  content directly (no network fetch)

`manifestSource` is persisted to IndexedDB (via the `appSettings` object
store) so the same source is reused across sessions until the user changes or
clears it. This keeps `manifestSource` co-located with the other app state
(`apps`, `catalog`, `loadStates`) in a single store. The DB migration cost is
negligible — adding an `appSettings` object store only requires incrementing
`currentVersion` in `src/data/db/index.ts` with no data migration.

#### Source modes

| Source mode | How catalog is obtained | Persistence | Use case |
| --- | --- | --- | --- |
| Default (`undefined`) | `fetch(DEFAULT_MANIFEST_URL)` | Nothing to persist | Normal operation with App Store |
| Custom URL | `fetch(url)` | `{ type: 'url', url }` in `appSettings` | Alternate catalog server, local dev server |
| Inline (file upload) | `JSON.parse(content)` | `{ type: 'inline', content }` in `appSettings` | Local testing, offline use, merged catalogs |

#### Custom URL use cases

| Use case                     | Example URL                                    | Notes                                       |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Local / same-origin file     | `/apps.json`, `http://localhost:8080/apps.json` | No CORS issues; typical for development     |
| Third-party external server  | `https://example.com/catalog/apps.json`        | Requires CORS headers on the remote server  |

#### Inline (file upload) behavior

When the user uploads a manifest file via the app manager UI:

1. The file is read via `FileReader.readAsText()`
2. The content is validated via `parseManifest(JSON.parse(content))`
3. If valid, `manifestSource` is set to `{ type: 'inline', content }` and
   persisted to IndexedDB
4. If invalid, an inline validation error is shown and no state change occurs

On subsequent startups, the persisted `content` string is parsed directly —
no file re-upload or network fetch is needed. If the stored content is
corrupted (JSON parse failure), the host clears `manifestSource`, falls back
to the default URL, and logs a warning.

See Section 7.6 for security considerations related to each source type.

### 6.6 AppStore Extension

AppStore becomes the single source of truth for external app state:

```typescript
interface AppState {
  apps: Record<string, CyApp>
  catalog: Record<string, AppCatalogEntry>
  loadStates: Record<string, AppLoadState>
  manifestSource?: ManifestSource  // undefined = use DEFAULT_MANIFEST_URL
  serviceApps: Record<string, ServiceApp>
  currentTask?: ServiceAppTask
}

interface AppAction {
  restore: (appIds: string[]) => Promise<void>
  add: (app: CyApp) => void
  remove: (id: string) => void        // delete apps[id], loadStates[id], and persisted IndexedDB record
  setCatalog: (entries: AppCatalogEntry[]) => void
  setLoadState: (id: string, state: AppLoadState) => void
  setManifestSource: (source: ManifestSource | undefined) => void
  setStatus: (id: string, status: AppStatus) => void
}
```

### 6.7 Why manifestSource, catalog, and loadStates belong in AppStore

These values are needed by:

- startup restore logic
- app manager UI
- enable and disable actions
- failure handling and retry
- manifest source switching
- runtime loading orchestration

Keeping them in AppStore provides one consistent state model for external apps.

**Persistence model:**

| Field            | Persisted?   | Where                                     | Rationale                                  |
| ---------------- | ------------ | ----------------------------------------- | ------------------------------------------ |
| `apps`           | Yes          | IndexedDB (per-record via `putAppToDb`)   | Activation status survives sessions        |
| `catalog`        | No           | —                                         | Re-fetched from manifest each session      |
| `loadStates`     | No           | —                                         | Session-local runtime state                |
| `manifestSource` | Yes          | IndexedDB (`appSettings` object store)    | Co-located with other app state            |
| `serviceApps`    | Yes          | IndexedDB                                 | Existing mechanism                         |

### 6.8 AppResourceStore and Cleanup Registry

Runtime-registered UI resources (menu items, panels) are managed by
`AppResourceStore`, which is deliberately separate from `AppStore`. This
separation exists because resources contain `React.lazy()` components whose
internal `_status` property must remain mutable; Immer middleware would freeze
these objects and cause runtime errors.

`AppResourceStore` is a non-persisted, non-Immer Zustand store:

- `resources: RegisteredAppResource[]` — all registered menu items and panels
- `upsertResource(resource)` — add or update a resource by `(appId, slot, id)`
- `removeAllByAppId(appId)` — remove all resources owned by an app

Cleanup of per-app resources is coordinated through `AppCleanupRegistry`, an
extensible registry pattern:

1. Each store that manages per-app state calls `registerAppCleanup(fn)` once at
   module load time
2. When an app is unmounted or `mount()` fails, `appLifecycle.ts` calls
   `cleanupAllForApp(appId)`, which delegates to all registered cleanup
   functions
3. Each cleanup function is wrapped in try/catch so one failure does not block
   others

Currently registered cleanup handlers:

- `AppResourceStore` → removes menu items and panels
- `ContextMenuItemStore` → removes context menu items

This registry is open for extension: adding a new per-app resource type (e.g.,
keyboard shortcuts) only requires a `registerAppCleanup()` call in the new
store — no changes to `appLifecycle.ts`.

**Execution model:** All cleanup handlers are **synchronous functions**.
`cleanupAllForApp()` iterates the handler list sequentially and completes
synchronously. If a future resource type requires async teardown (e.g., aborting
in-flight network requests), a dedicated async cleanup phase will be introduced
at that time — it is out of scope for this rollout.

### 6.9 CyAppWithLifecycle Contract

The remote module's default export must conform to `CyAppWithLifecycle`
(defined in `src/app-api/types/AppContext.ts`), which extends the base `CyApp`
interface:

| Field | Type | Required | Source |
| --- | --- | --- | --- |
| `id` | `string` | **Yes** | `CyApp` — Module Federation scope name |
| `name` | `string` | **Yes** | `CyApp` — human-readable display name |
| `version` | `string` | No | `CyApp` — semantic version |
| `description` | `string` | No | `CyApp` — short description |
| `status` | `AppStatus` | No | `CyApp` — set by host (default `Active`) |
| `apiVersion` | `string` | No | `CyAppWithLifecycle` — target API version |
| `resources` | `ResourceDeclaration[]` | No | `CyAppWithLifecycle` — declarative panel/menu registrations |
| `mount` | `(context: AppContext) => void \| Promise<void>` | No | `CyAppWithLifecycle` — called on activation |
| `unmount` | `() => void \| Promise<void>` | No | `CyAppWithLifecycle` — called on deactivation |

Apps that export only `CyApp` fields (no lifecycle, no resources) continue to
work — they are registered and appear in the UI but have no mount/unmount
behavior.

## 7. Runtime Manifest Loading

### 7.1 Manifest Contract

The host fetches the app manifest at runtime from a static JSON file.

The manifest is an array of objects. Two formats are accepted:

```json
[
  {
    "id": "hello",
    "name": "Hello World App",
    "url": "http://localhost:2222/remoteEntry.js",
    "author": "Cytoscape Team",
    "description": "A simple hello world demo app",
    "version": "1.0.0",
    "tags": ["demo", "getting-started"],
    "icon": "https://apps.cytoscape.org/icons/hello.png",
    "license": "MIT",
    "repository": "https://github.com/cytoscape/cytoscape-web-app-examples",
    "compatibleHostVersions": ">=1.0.0"
  },
  { "name": "networkWorkflows", "url": "http://localhost:7000/remoteEntry.js" }
]
```

Normalization rules:

- If `id` is present, it is used as the Module Federation scope name
- If `id` is absent, `name` is used as `id` (backward compatibility with
  existing apps.json format)
- If `name` is absent, `id` is used as the display name
- After normalization, `id` must be non-empty and unique within the manifest
- `author` defaults to `"unknown"` when absent in the manifest entry. This
  ensures backward compatibility with legacy `{ name, url }` manifests while
  the App Store enforces `author` on its submission side

This ensures full backward compatibility with the existing `{ name, url }`
format while supporting richer metadata from the App Store.

#### Manifest Validation

The host validates the fetched manifest using a zod schema before
normalization. Validation uses a skip-and-warn strategy at the entry level:

```typescript
const AppManifestEntrySchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/).optional(),
    name: z.string().min(1).optional(),
    url: z.string().url(),
    author: z.string().min(1).optional().default('unknown'),
    description: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
    icon: z.string().url().optional(),
    license: z.string().optional(),
    repository: z.string().url().optional(),
    compatibleHostVersions: z.string().optional(),
    dependencies: z.array(z.string()).optional(), // accepted but ignored at runtime (first rollout)
  })
  .refine((e) => e.id !== undefined || e.name !== undefined, {
    message: 'Either id or name must be present',
  })

const AppManifestSchema = z.array(AppManifestEntrySchema)
```

Validation rules:

- If the fetched data is not an array, the entire manifest is rejected →
  empty catalog + warning log
- Each entry is validated independently. Invalid entries are skipped with a
  warning log; valid entries proceed to normalization
- When `id` is absent and `name` is used as fallback, `name` must also match
  the identifier pattern (`/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`). If it does not,
  the entry is skipped with a warning
- After normalization, duplicate `id` values are resolved by keeping the first
  occurrence and logging a warning for subsequent duplicates
- `dependencies` entries that reference unknown IDs (not present in the
  manifest), self-references, or duplicates are logged as warnings and
  ignored during normalization. In the first rollout, `dependencies` has no
  runtime effect (see Section 6.4)
- After remote loading, `CyApp.id` from the loaded module must match the
  manifest `id`. A mismatch is treated as a load failure

The validation and normalization logic is encapsulated in a single pure
function:

```typescript
function parseManifest(data: unknown): AppCatalogEntry[]
```

This function is the sole entry point for converting raw fetched JSON into
validated, normalized catalog entries.

The host normalizes each valid manifest entry into an AppCatalogEntry and
stores it in catalog.

### 7.2 Manifest Source Resolution

The effective manifest source determines how the catalog is obtained:

```
manifestSource === undefined          → fetch(DEFAULT_MANIFEST_URL)
manifestSource.type === 'url'         → fetch(manifestSource.url)
manifestSource.type === 'inline'      → JSON.parse(manifestSource.content)
```

`manifestSource` is persisted to IndexedDB via AppStore's `appSettings` object
store so the same source is reused across sessions until the user changes or
clears it. On startup, `useAppManager` reads `manifestSource` from
`appSettings` via `getAppSettingFromDb('manifestSource')` and hydrates
`AppStore.manifestSource` **before** resolving the manifest. This is separate
from `restore()`, which only handles app record recovery and runs **after**
the manifest is resolved. Clearing `manifestSource` (setting it to
`undefined`) removes the persisted entry and reverts to the default App Store
URL.

Resolution is implemented by a single helper function
`obtainCatalogEntries(source: ManifestSource | undefined)` that encapsulates the
three-way branch above. This is the **sole entry point** for all manifest
resolution — callers never call `fetchManifest` or `parseManifest` directly.

### 7.3 Manifest Load Sequence

The host startup sequence is:

1. Read `manifestSource` from IndexedDB and hydrate `AppStore.manifestSource`
2. Call `obtainCatalogEntries(manifestSource)` to obtain validated and
   normalized `AppCatalogEntry[]` (fetches URL or parses inline content,
   then runs `parseManifest()` internally — invalid entries are skipped
   with warning logs)
3. Store valid entries in catalog via `setCatalog(entries)`
4. Extract catalog app IDs
5. Call `restore(catalogAppIds)` to load persisted app records from IndexedDB
6. Determine which restored apps should be auto-loaded
7. For each active app: `loadRemoteApp` → register → resources → context → mount

```
┌─────────────────────────────────────────────────────────────────┐
│  useAppManager init useEffect                                   │
│                                                                 │
│  ① getAppSettingFromDb('manifestSource')                        │
│     └→ hydrate AppStore.manifestSource                          │
│                                                                 │
│  ② obtainCatalogEntries(manifestSource)                         │
│     ├─ undefined / url  → fetchManifest(url)                    │
│     └─ inline           → JSON.parse(content)                   │
│     └→ parseManifest() → validated AppCatalogEntry[]            │
│                                                                 │
│  ③ setCatalog(entries)                                          │
│                                                                 │
│  ④ restore(catalogAppIds)                                       │
│     └→ on failure: warn + continue with empty state             │
│                                                                 │
│  ⑤ setRestored(true)                                            │
│                                                                 │
│  ⑥ Select apps with AppStatus.Active                            │
│     └→ Promise.allSettled:                                      │
│        for each active app:                                     │
│          setLoadState(id, 'loading')                             │
│          loadRemoteApp(id, url)                                 │
│          registerApp(cyApp)                                     │
│          processDeclarativeResources(cyApp)                     │
│          buildPerAppApis(id) → context                          │
│          mountApp(cyApp, context, mountedApps)                  │
│          setLoadState(id, 'loaded')                             │
│        on failure:                                              │
│          setLoadState(id, 'failed')                             │
│          setStatus(id, AppStatus.Error)                         │
└─────────────────────────────────────────────────────────────────┘
```

**Ordering constraint:** `initEventBus()` (see
[event-bus-specification.md §1.9](./event-bus-specification.md)) runs in
`src/init.tsx` **before** `useAppManager` mounts. This is unaffected by the
changes in this spec — the manifest/restore/auto-load sequence executes inside
a React `useEffect`, which fires after `initEventBus()` has completed.

The `restore` action's contract is unchanged — it takes an array of app IDs
and loads matching records from IndexedDB. The only difference from the current
behavior is that the IDs now come from the runtime catalog instead of the
build-time `apps.json`.

#### Restore Failure Policy

`restore()` failure (e.g., IndexedDB access error) is **non-fatal**. If the
call rejects, the host:

1. Logs a warning via the structured logger
2. Continues with an empty restored app state (no previously active apps)
3. Sets the `restored` flag to `true` so the startup sequence always completes
4. Proceeds to load apps from the manifest catalog only

This ensures that a corrupted or inaccessible IndexedDB does not block the
host from starting. The behavior is analogous to a first-time user with no
persisted state.

#### Orphan Records

App records persisted in IndexedDB but absent from the current manifest are
not passed to `restore` and therefore not loaded into the store. These orphan
records are kept in IndexedDB rather than purged, because:

- They are harmless (small storage footprint)
- If the user switches `manifestSource` back to a source that includes the app,
  the persisted state (including `AppStatus`) is restored automatically

Periodic cleanup or manual purge of orphan records may be added in a future
rollout if IndexedDB growth becomes a concern.

### 7.4 Manifest Failure Handling

Failure behavior differs between startup and manual refresh:

**Startup fetch failure:**

- the host remains usable
- catalog becomes empty (no prior catalog exists)
- no external apps are auto-loaded
- a warning is logged
- if a custom `manifestSource` fails, the host offers a UI action to clear it
  and revert to the default App Store URL

**Manual refresh failure:**

- the **previous catalog is retained** — a transient network error must not
  wipe the user's visible app list
- a toast or inline error notifies the user that refresh failed
- already-loaded apps continue running unaffected
- the user can retry the refresh at any time

**Malformed manifest (applies to both startup and refresh):**

- if the response is not a JSON array, the manifest is rejected entirely:
  at startup catalog becomes empty; on refresh the previous catalog is retained
- if individual entries fail zod validation, they are skipped and the
  remaining valid entries populate the catalog
- validation errors are logged with the entry index and zod error message
- the host must not crash

### 7.5 Manifest Caching Strategy

The host does not implement custom caching logic for the manifest. Caching
operates at three levels:

| Level                         | Behavior                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| In-memory (`AppStore.catalog`) | Fetched once at startup; held for the session duration      |
| Manual refresh                 | User triggers re-fetch via a refresh button in the UI       |
| HTTP cache                     | Browser handles `Cache-Control`, `ETag`, etc. transparently |

The host calls `fetch()` without custom cache headers and delegates cache
behavior to the browser and the manifest server. No TTL management, no
localStorage caching, no stale-while-revalidate logic is implemented in the
host.

#### Refresh Behavior

When the user triggers a manual catalog refresh:

1. Re-fetch the manifest from the current effective URL
2. Validate and normalize via `parseManifest()`
3. Update `AppStore.catalog` with the new entries

Effect on already-loaded apps:

- **Loaded apps remain running** — their `loadStates` stay `loaded` and their
  lifecycle is not interrupted. A catalog refresh updates the available app
  list, not the state of running apps.
- **New apps** added to the manifest appear in the app manager UI as available
  for enable.
- **Removed apps** that are currently loaded continue running for the remainder
  of the session. They will not be auto-loaded on the next startup because
  they will no longer be present in the catalog passed to `restore`. In the
  app manager UI, these apps are shown as session-only entries with Disable as
  the only available action (they cannot be re-enabled since they are no
  longer in the catalog). See the `No` / `loaded` row in Section 11.2.
- **Currently loading apps** — if a load attempt is in progress when a catalog
  refresh removes the app, the load attempt continues to completion. After it
  finishes successfully, the app is treated as a session-only orphan (same as
  a loaded app removed by refresh). If the load attempt fails, `loadStates`
  is set to `failed` as usual, but since the app is no longer in the catalog,
  retry is not available — the failed entry is silently discarded at the end
  of the session.

### 7.6 Security Considerations

Loading external apps means fetching and executing third-party JavaScript in
the host's browser context. The security implications differ by manifest source
type and app origin.

#### 7.6.1 Manifest Fetch

| Source type                  | CORS            | Notes                                            |
| ---------------------------- | --------------- | ------------------------------------------------ |
| Same-origin / relative path  | Not required    | `/apps.json` or local dev server                 |
| Third-party external server  | Required        | Server must send `Access-Control-Allow-Origin`   |

If CORS headers are missing on a third-party manifest URL, the fetch will fail.
This is handled by the manifest failure path (Section 7.4) — the host remains
usable with an empty catalog.

#### 7.6.2 Remote Entry Script Loading

`ExternalComponent.tsx` loads remote apps by injecting `<script>` tags
pointing to each app's `remoteEntry.js` URL. This has two browser-level
constraints:

- **Content Security Policy (CSP)**: If the host sets a `script-src` directive,
  the remote entry origin must be included. A strict CSP that does not
  allowlist the remote origin will block the `<script>` tag silently. In the
  first rollout, the host does not enforce a strict CSP; if CSP is introduced
  later, it must account for dynamic remote origins.
- **Mixed content**: If the host is served over HTTPS, browsers will block
  `<script>` tags pointing to HTTP origins. Remote entry URLs in the manifest
  should use HTTPS in production deployments.

#### 7.6.3 Trust Model

Loading a remote entry executes arbitrary JavaScript in the host's full
browser context. The trust boundary depends on the manifest source:

| Source                       | Trust level     | Rationale                                        |
| ---------------------------- | --------------- | ------------------------------------------------ |
| Default App Store            | Curated         | Apps are reviewed before being listed             |
| User-supplied local file     | User-controlled | User takes responsibility for the app list        |
| User-supplied external URL   | User-controlled | User trusts the remote server and its contents    |

In all cases, the user explicitly chooses to enable each app before any remote
code is executed. The host does not auto-activate apps from a newly loaded
manifest — it only auto-loads apps the user had previously activated.

#### 7.6.4 First-Rollout Scope

The first rollout does not implement:

- CSP `script-src` dynamic allowlisting
- URL scheme validation beyond zod's `z.string().url()` (no HTTPS enforcement)
- Manifest signature verification or integrity checks
- Sandboxing of loaded remote modules (e.g., iframe isolation)

These are potential future enhancements as the App Store ecosystem matures.

## 8. Startup Auto-Load Policy

### 8.1 Rule

Only apps persisted as active are auto-loaded at startup.

This is the startup policy for the first rollout.

### 8.2 Rationale

This policy provides the best balance between continuity and performance:

- apps the user actively uses remain available after restart
- inactive apps do not increase startup network cost
- startup traffic scales with real usage, not manifest size

### 8.3 Startup Flow

After restore completes:

1. Inspect restored app records
2. Select only apps with status equal to active
3. Load all selected apps in parallel using `Promise.allSettled`
4. For each successfully loaded app:
   1. register the loaded app
   2. process declarative resources
   3. mount the app
   4. set loadStates[id] to loaded

Each app's load is independent — one failure does not block or delay others.
The per-app sequence within each settled promise is:
set loadStates[id] to loading → call loadRemoteApp → register → mount.

If loading fails for an individual app:

1. set loadStates[id] to failed
2. optionally set AppStatus to error
3. continue with the remaining apps

### 8.4 Concurrency Strategy

The first rollout reference implementation may use `Promise.allSettled` with
unbounded scheduling. This is appropriate because:

- Each app loads from a different remote server, so requests are independent
- The browser's built-in per-origin connection limit (typically 6) provides
  natural throttling
- Initial catalogs are expected to be small
- One app's failure must not block others

When the App Store serves all remote entries from a single origin, the
browser's per-origin connection limit (typically 6) acts as a natural
concurrency bound. This is sufficient for the first rollout.

If catalogs grow to tens or hundreds of apps, bounded concurrency (e.g.,
`p-limit`) can be introduced. Because all loads funnel through
`loadRemoteApp` and the orchestrator's `Promise.allSettled` loop, adding a
concurrency cap requires changing only the scheduling logic in the
orchestrator — the per-app loader interface and the lifecycle hooks remain
unchanged. Bounded concurrency remains an implementation-compatible optimization — the
specification does not require unbounded scheduling. The single-entry-point
design ensures a future cap can be added in one place without changing the
per-app loader contract or lifecycle hooks.

### 8.5 Inactive and Unknown Apps

If an app exists in the manifest but is:

- persisted as inactive, or
- not present in IndexedDB

then it remains visible in the catalog but is not loaded.

## 9. Activation and Deactivation Policy

### 9.1 First-Time Activation

When a user enables an app that is not currently loaded, the host should load
and activate the app immediately in the current page.

The host performs:

1. Resolve the app's catalog entry
2. Set `loadStates[id] = 'loading'`
3. Call `loadRemoteApp(id, url)` to fetch and initialize the remote container
4. Register the loaded app in `AppStore.apps`
5. Process declarative resources
6. Call `mount()` if present
7. Persist `AppStatus.Active`
8. Set `loadStates[id] = 'loaded'`

The app becomes available in Apps menu and panel regions without reloading the
host page.

### 9.2 Activation Failure and Rollback

Failure handling depends on which stage failed. The following table defines the
rollback behavior for each stage:

| Failure stage              | appRegistry          | AppStore.apps        | Resources                    | loadStates | AppStatus                                         |
| -------------------------- | -------------------- | -------------------- | ---------------------------- | ---------- | ------------------------------------------------- |
| `loadRemoteApp` fails      | No change            | No change            | No change                    | `failed`   | First-time: keep `Inactive`; existing: set `Error` |
| register / resource fails  | Entry remains (bundle in memory) | Remove if newly added (see below) | `cleanupAllForApp(appId)` | `failed`   | First-time: keep `Inactive`; existing: set `Error` |
| `mount()` fails            | Entry remains         | Remains              | `cleanupAllForApp(appId)`    | `failed`   | First-time: keep `Inactive`; existing: set `Error` |

Rollback procedure by stage:

1. **`loadRemoteApp` failure** — the remote bundle could not be fetched or
   initialized. No host state was modified. Set `loadStates[id] = 'failed'`.

2. **register / resource registration failure** — the app was partially
   registered in `AppStore.apps` or `AppResourceStore`. Call
   `cleanupAllForApp(appId)` to remove resources. Remove the
   `AppStore.apps` entry **only if it did not exist before this activation
   attempt started** (i.e., the orchestrator checks `id in apps` before
   beginning the attempt and records the result). If the entry existed prior
   to this attempt (e.g., a previously active app being retried), it is
   retained. Set `loadStates[id] = 'failed'`.

3. **`mount()` failure** — resources are registered and the app is in
   `AppStore.apps`, but `mount()` threw or rejected. Call
   `cleanupAllForApp(appId)` to remove resources. Do NOT call `unmount()`
   (mount did not complete). `AppStore.apps` entry remains (metadata is
   valid). Set `loadStates[id] = 'failed'`.

AppStatus policy:

- **First-time activation** (app was `Inactive` or missing): keep
  `AppStatus.Inactive`. The user can retry via the Enable action.
- **Startup auto-load of previously active app**: set `AppStatus.Error` to
  signal that a previously working app needs attention. The user can retry
  via the Retry action.

### 9.3 Subsequent Startups

Once an app has been enabled successfully, it participates in the normal
auto-load path like any other persisted active app.

### 9.4 Deactivation

When a loaded app is deactivated from the UI, the host should:

1. Persist `AppStatus.Inactive`
2. Call `unmountApp(cyApp, mountedApps)` — this is the **sole cleanup entry
   point**. Internally, `unmountApp` calls `cleanupAllForApp(appId)` (removing
   all per-app resources from `AppResourceStore`, `ContextMenuItemStore`, and
   any other stores registered with the cleanup registry) and then calls the
   app's `unmount()` lifecycle if present

The orchestrator must **not** call `cleanupAllForApp` directly during
deactivation — `unmountApp` owns that responsibility. This prevents double
cleanup if future cleanup handlers acquire side effects.

What is **not** changed by deactivation:

- `loadStates` remains `loaded` (remote bundle is still in browser memory)
- `AppStore.apps[id]` remains (CyApp metadata is still valid)
- `appRegistry` entry remains (React.lazy references are still usable)

This ensures fast re-activation without re-fetching (see Section 9.6).

This deactivation path is immediate and does not require page reload.

#### Cleanup Registry Summary

`cleanupAllForApp(appId)` (defined in `AppCleanupRegistry.ts`) iterates all
registered cleanup handlers synchronously. In the current codebase, two
handlers are registered:

1. **`AppResourceStore.removeAllByAppId`** — removes all `RegisteredAppResource`
   entries (menu items and panels) owned by `appId`
2. **`ContextMenuItemStore.removeAllByAppId`** — removes all context menu items
   registered by `appId` (items without an `appId` are preserved)

Each handler is wrapped in try/catch so one store's failure does not block
the others. The registry is extensible — future per-app resource types only
need a `registerAppCleanup()` call in their store.

#### AppStore.apps vs appRegistry

These two structures serve different roles and are not redundant:

- `AppStore.apps` — serializable CyApp metadata managed by Zustand/Immer,
  persisted to IndexedDB. Does not contain React.lazy references (they are
  stripped by `toPlainObject` before persistence).
- `appRegistry` — runtime Map holding CyApp objects with live React.lazy
  component references. Not persisted; exists only for the session duration.
  Required because Immer would freeze React.lazy internals.

Both are populated when an app is loaded. Neither is removed on deactivation.

### 9.5 Meaning of "Unload"

In this specification, "unload" means host-level deactivation:

- unmount the app lifecycle
- remove host-managed resources (via `AppCleanupRegistry`)
- stop rendering the app's UI

It does **not** mean that the browser reclaims the previously downloaded remote
JavaScript bundle on demand. Full bundle eviction is out of scope for the first
rollout.

### 9.6 Re-Enable Behavior

If an app has `loadStates[id] === 'loaded'` and `AppStatus.Inactive`, the
remote module is already in memory. Re-enabling this app skips the network
fetch and goes directly to register → process declarative resources → mount.

The orchestrator uses `loadStates` to decide the re-enable path:

- `loaded` → skip `loadRemoteApp`, reuse `appRegistry` entry
- `unloaded` or `failed` → call `loadRemoteApp` (full fetch)

### 9.7 Lifecycle State Machine

The following table defines all valid state transitions for app activation and
deactivation. Each row is a trigger event; columns show the before/after values
of the two orthogonal state dimensions (`AppStatus` in AppStore, `AppLoadState`
in session-local `loadStates`).

| # | Trigger | AppStatus before | LoadState before | AppStatus after | LoadState after | Actions |
|---|---------|-----------------|-----------------|----------------|----------------|---------|
| 1 | First-time activate (user click) | _(none)_ | `unloaded` | `Active` | `loading` → `loaded` | `loadRemoteApp` → register → declarative resources → `mount()` |
| 2 | First-time activate — load fails | _(none)_ | `unloaded` | `Inactive` | `failed` | Rollback per Section 9.2; keep `Inactive` so user can retry via Enable |
| 3 | First-time activate — mount fails | _(none)_ | `unloaded` | `Inactive` | `failed` | `cleanupAllForApp(appId)`; keep `Inactive` per Section 9.2 |
| 4 | Startup auto-load (persisted active) | `Active` | `unloaded` | `Active` | `loading` → `loaded` | `loadRemoteApp` → register → declarative resources → `mount()` |
| 5 | Startup auto-load — fails | `Active` | `unloaded` | `Error` | `failed` | Set `Error` to signal previously working app needs attention; show Retry |
| 6 | Deactivate (user click) | `Active` | `loaded` | `Inactive` | `loaded` | `unmountApp(cyApp, mountedApps)` (internally runs cleanup then `unmount()`; see §9.4) |
| 7 | Re-enable (user click, module cached) | `Inactive` | `loaded` | `Active` | `loaded` | Reuse `appRegistry` entry → declarative resources → `mount()` |
| 8 | Re-enable (user click, module evicted) | `Inactive` | `unloaded` | `Active` | `loading` → `loaded` | Full `loadRemoteApp` → register → declarative resources → `mount()` |
| 9 | Retry after failure | `Error` | `failed` | `Active` | `loading` → `loaded` | Full `loadRemoteApp` flow |
| 10 | Retry — fails again | `Error` | `failed` | `Error` | `failed` | No state change, show error |
| 11 | Manifest refresh — app removed | `Active` | `loaded` | `Active` | `loaded` | No immediate action; app becomes session-only orphan (Section 7.5) |
| 12 | Disable session-only orphan | `Active` | `loaded` | `Inactive` | `loaded` | `unmountApp(cyApp, mountedApps)`; re-enable not possible (no catalog entry) |
| 13 | Remove orphan app | `Inactive` | `loaded` | n/a (entry removed) | n/a (entry removed) | `AppStore.remove(id)` (apps, loadStates, IndexedDB) + `appRegistry.delete(id)`; app disappears from UI |

**Invariants:**

- `LoadState` is never persisted — it starts as `unloaded` on every session
- `loaded` means the webpack container is initialized in memory; it says nothing
  about activation
- `AppStatus` is persisted to IndexedDB; `LoadState` is session-only
- A transition from `Inactive` to `Active` always requires `mount()` to be
  called, regardless of `LoadState`

## 10. Failure and Retry

### 10.1 Startup Load Failure

If startup loading of an active app fails:

1. set loadStates[id] to failed
2. keep the rest of the host usable
3. expose retry in the app manager UI

### 10.2 Retry

Retry sets `loadStates[id]` back to `loading` and repeats the same load flow
(`loadRemoteApp` → register → resources → mount) using the current catalog
entry.

Retry applies to both startup auto-load failures and user-initiated activation
failures.

## 11. UI Behavior

### 11.1 App Manager Panel

The app manager panel uses catalog as its display source of truth.

For each app, the UI combines:

- catalog entry
- loaded app record, if any
- loadStates entry
- persisted AppStatus

to decide which action to show.

The panel must also expose manifest source controls:

- show the current manifest source (or indicate "Default" when
  `manifestSource` is `undefined`)
- allow entering or editing a custom manifest source URL
- allow uploading a manifest file from the local filesystem
- allow clearing the custom source to revert to the default

**Custom URL validation policy:**

Custom manifest source URLs are validated **before** being saved to `AppStore`:

1. Parse with `new URL(input, window.location.origin)` — this resolves both
   absolute URLs and same-origin relative paths (e.g., `/apps.json`). Reject
   if parsing fails
2. Protocol of the resolved URL must be `https:` in production builds;
   `http:` is permitted only in development mode
   (`NODE_ENV !== 'production'`)
3. The resolved absolute URL is stored in
   `AppStore.manifestSource` as `{ type: 'url', url }` (not the raw input),
   ensuring consistent fetch behavior across sessions
4. If validation fails, the source is **not saved** and an inline validation
   error is shown immediately (no round-trip to the server)
5. If validation passes but the subsequent fetch fails, the source remains
   saved and the failure is handled per Section 7.4 (manual refresh failure
   policy)

**File upload validation policy:**

Uploaded manifest files are validated **before** being saved:

1. Read the file via `FileReader.readAsText()`
2. Parse the content as JSON — reject if parsing fails
3. Validate via `parseManifest()` — reject if zero valid entries result
4. Store as `{ type: 'inline', content }` in `AppStore.manifestSource`
5. If validation fails, the source is **not saved** and an inline error is
   shown

**Manifest source switching behavior:**

Switching the manifest source changes which apps appear in the catalog but
does not delete persisted app state. Apps that were active under the previous
source but are absent from the new source become orphan records (see
Section 7.3). Their `AppStore.apps` entries and `AppStatus` are retained in
IndexedDB. If the user switches back to the original manifest source, these
entries are restored automatically and the apps resume their previous
activation state.

### 11.2 UI States

| Catalog | Load state | Status              | UI behavior                                  |
| ------- | ---------- | ------------------- | -------------------------------------------- |
| Yes     | unloaded   | inactive or missing | Show Enable                                  |
| Yes     | loading    | any                 | Show loading indicator                       |
| Yes     | loaded     | active              | Show Disable (app is running)                |
| Yes     | loaded     | inactive            | Show Enable (fast, no network fetch)         |
| Yes     | failed     | any                 | Show Retry                                   |
| No      | loaded     | active              | Show Disable only (session-only, see below)  |
| No      | loaded     | inactive            | Show Remove only (re-enable not possible)    |
| No      | failed     | any                 | Do not display (no catalog entry, no retry)  |

Note: `loadStates` tracks whether the remote module is in memory, not whether
the app is active (see Section 6.3). A `Catalog = Yes` / `loaded + inactive`
app was previously fetched and can be re-enabled without a network round-trip
(see Section 9.6). This does **not** apply to orphan apps (`Catalog = No`),
which cannot be re-enabled because the remote URL is no longer known.

The `No` / `loaded` / `active` row occurs when a catalog refresh removes an
app that is currently running. The app continues to run for the session but
cannot be re-enabled after deactivation because it is no longer in the
catalog. The app manager shows it as a session-only entry with Disable as
the only action.

The `No` / `loaded` / `inactive` row occurs when a user disables a
session-only orphan app (the row above). Since the app is no longer in the
catalog, re-enabling is not possible. The only available action is Remove.

**Remove behavior:** Remove is an explicit user action that deletes the
orphan app from **both** layers:

1. **Store entries** — the orchestrator calls `AppStore.remove(id)` (see
   Section 6.6), which deletes `AppStore.apps[id]`, `loadStates[id]`, and
   the persisted IndexedDB record
2. **Runtime registry** — the orchestrator separately calls
   `appRegistry.delete(id)` to remove the module-level Map entry

`AppStore.remove()` does **not** touch `appRegistry` — the runtime Map lives
outside Zustand and is managed by the orchestrator (see Section 9.5 for the
separation of responsibilities). After Remove, the app will not reappear even if the manifest source
is switched back. This is distinct from the automatic orphan retention policy
(Section 7.3), which preserves records without user intervention:

- **Automatic:** orphan records are retained in IndexedDB — switching back
  to the original manifest restores them
- **Manual Remove:** the user explicitly deletes the record — it is gone
  permanently and must be re-activated from scratch if the app reappears in
  a future catalog

The `No` / `failed` row occurs when a load attempt was in progress during a
catalog refresh that removed the app, and the load subsequently failed (see
Section 7.5). Since the app has no catalog entry, retry is not available.
The failed `loadStates` entry remains in session memory but is not displayed
in the app manager — it is silently discarded at session end.

### 11.3 Apps Menu and Panels

Apps menu and panel rendering continue to use only loaded apps.

This means:

- unloaded apps appear in the app manager panel
- unloaded apps do not appear in Apps menu or panel regions
- no placeholder resource registration is required for unloaded apps

This preserves the current rendering assumptions and minimizes regression risk.

## 12. Store and Lifecycle Responsibilities

### 12.1 AppStore Responsibilities

AppStore owns:

- manifest-derived app catalog
- manifest source (user override or undefined for default)
- loaded app records
- runtime load states
- persisted activation status
- service app state

### 12.2 AppResourceStore Responsibilities

AppResourceStore owns runtime-registered UI resources:

- menu items (`slot: 'apps-menu'`)
- panels (`slot: 'right-panel'`)

This store is separate from AppStore because it holds `React.lazy()` components
that Immer would freeze. It is not persisted; resources are re-registered on
each app mount.

### 12.3 AppCleanupRegistry Responsibilities

AppCleanupRegistry owns per-app cleanup coordination:

- maintains a list of cleanup functions registered by resource-owning stores
- provides `cleanupAllForApp(appId)` as the single cleanup entry point for
  `appLifecycle.ts`
- isolates cleanup failures so one store's error does not block others

### 12.4 useAppManager Responsibilities

useAppManager owns orchestration:

- resolve manifest source via `obtainCatalogEntries`
- populate catalog
- restore persisted app state
- auto-load persisted active apps
- handle in-page dynamic activation
- coordinate mount and unmount

#### 12.4.1 Command Surface

`useAppManager` returns a command object that UI components use to trigger
orchestration flows. The UI must **not** call `AppStore.setStatus` or
`cleanupAllForApp` directly — all user-initiated actions flow through the
command surface.

```typescript
interface AppManagerCommands {
  activateApp: (id: string) => Promise<void>
  deactivateApp: (id: string) => Promise<void>
  retryApp: (id: string) => Promise<void>
  refreshCatalog: () => Promise<void>
  setManifestSource: (source: ManifestSource | undefined) => void
  removeOrphan: (id: string) => void
}

export const useAppManager = (): AppManagerCommands => { ... }
```

| Command          | Orchestration flow                                                        |
| ---------------- | ------------------------------------------------------------------------- |
| `activateApp`    | Resolve catalog → `loadRemoteApp` (if needed) → register → resources → `mountApp` → persist `Active` |
| `deactivateApp`  | Persist `Inactive` → `unmountApp` (which internally cleans up)            |
| `retryApp`       | Same as `activateApp` with `loadStates` reset to `loading`               |
| `refreshCatalog` | `obtainCatalogEntries(manifestSource)` → `setCatalog`                    |
| `setManifestSource` | Validate source → update `AppStore.manifestSource` → persist to IndexedDB |
| `removeOrphan`   | `AppStore.remove(id)` → `appRegistry.delete(id)`                        |

#### 12.4.2 Mount Ownership Rule

All mount calls flow through a single internal `activateAndMount(id)` helper
inside `useAppManager`. This helper:

1. Checks `mountedApps.has(id)` — if true, returns immediately (already mounted)
2. Checks `mountingApps.has(id)` — if true, returns immediately (mount in progress)
3. Adds `id` to `mountingApps` (a per-app async guard Set)
4. Calls register → `processDeclarativeResources` → `mountApp`
5. Removes `id` from `mountingApps` on completion (success or failure)

Both startup auto-load (§8.3) and user-initiated activation (§9.1) call
`activateAndMount`. The lifecycle `useEffect` monitors only **unmount
triggers** (`Active` → `Inactive` status transitions) and does **not**
initiate mount. This eliminates the race condition where startup auto-load
and the lifecycle effect both attempt to mount the same app.

### 12.5 Lifecycle Reuse

Existing lifecycle helpers remain valid:

- register app
- process declarative resources
- mount app → on failure, `cleanupAllForApp(appId)` rolls back resources
- unmount app → `cleanupAllForApp(appId)` then `lifecycle.unmount()`

The main change is that they run per app on demand instead of eagerly for the
entire manifest during startup.

## 13. Migration Strategy

Recommended implementation order. Each step should be independently
verifiable — the host must build and function correctly after each step.

### Step 0 — Decouple the host build from the app list

This step removes all build-time and import-time dependencies on the static
app list. After this step, the host runs with **zero external apps** — this is
the expected transitional state until Step 2 restores app loading via the
runtime manifest.

The step is decomposed into four sub-steps. Each sub-step can be committed
independently, and the host must build and start after each one.

**0a — Remove webpack remotes configuration**

- Delete the `externalAppsConfig` generation loop (`webpack.config.js:37–41`)
  and the `remotes` key from `ModuleFederationPlugin` (`webpack.config.js:123`)
- `exposes` and `shared` remain unchanged
- Verify: `npm run build` succeeds

**0b — Remove runtime appConfig import**

- Remove `import appConfig from '../../../assets/apps.json'`
  (`useAppManager.ts:12`) and the derived `appIds` array
- Verify: host builds (useAppManager no longer references apps.json)

**0c — Remove top-level await and module-level state**

- Remove `const loadedApps = await loadModules()` (`useAppManager.ts:74`)
  and the `loadModules` function
- Remove module-level `activatedAppIdSet`
- Verify: host starts without top-level await blocking module evaluation

**0d — Convert appRegistry to a dynamic Map**

- Change `appRegistry` from a pre-populated `new Map(loadedApps.map(...))`
  to an empty `new Map()` that will be populated on demand by `loadRemoteApp`
  in later steps
- Export `appRegistry` so it remains accessible to rendering code
- Verify: host starts and runs correctly with an empty app registry (no
  external apps are loaded, app menu is empty — this is expected)

### Step 1 — Add types and store fields

- Add `AppCatalogEntry`, `AppLoadState`, and `ManifestSource` types
- Add `catalog`, `loadStates`, and `manifestSource` fields to AppStore
- Add `setCatalog`, `setLoadState`, `setManifestSource`, and `remove` actions
- Add `appSettings` object store to IndexedDB (version bump)
- The `remove` action deletes both the in-memory `AppStore.apps[id]` entry
  and the corresponding persisted IndexedDB record
- Define `DEFAULT_MANIFEST_URL` constant
- No behavioral change yet — new fields are populated but unused

### Step 2 — Runtime manifest fetch and validation

- Implement `parseManifest(data: unknown): AppCatalogEntry[]` with zod
  validation and normalization (id/name fallback, duplicate detection)
- Add manifest resolution logic to `useAppManager`: resolve effective source
  (see §7.2), fetch or parse inline, call `setCatalog`
- Verify: host fetches manifest at startup and populates `catalog`

### Step 3 — Extract per-app loader

- Extract `loadRemoteApp(id, url): Promise<CyApp | undefined>` as a
  standalone async function using `ExternalComponent.loadModule`
- On success, add the result to `appRegistry`
- On failure, return `undefined`
- This function has no store side effects — it only interacts with
  `ExternalComponent` and `appRegistry`

### Step 4 — Selective startup loading

- After `restore(catalogAppIds)`, select apps with `AppStatus.Active`
- Load them via `Promise.allSettled` calling `loadRemoteApp` for each
- Update `loadStates` (loading → loaded / failed) around each load
- Run register → processDeclarativeResources → mountApp for each success
- Verify: only previously active apps are loaded at startup; inactive apps
  remain unloaded

### Step 5 — User-initiated in-page activation

- When the user enables an unloaded app, call `loadRemoteApp` → register →
  resources → mount in a single flow
- On success, persist `AppStatus.Active` and set `loadStates` to `loaded`
- On failure, run `cleanupAllForApp(appId)` rollback per Section 9.2
- If `loadStates` is already `loaded` (re-enable), skip fetch and go directly
  to register → resources → mount
- Verify: enabling an unloaded app loads and activates it without page reload

### Step 6 — Deactivation cleanup

- When the user disables a loaded app, persist `AppStatus.Inactive`, then
  call `unmountApp(cyApp, mountedApps)` — this is the sole cleanup entry
  point (internally runs `cleanupAllForApp` then `unmount()`; see §9.4)
- `loadStates` remains `loaded` (remote bundle stays in memory)
- Verify: disabling an app removes its UI immediately; re-enabling is fast

### Step 7 — App manager UI updates

- Render the app manager panel from `catalog` (not from loaded apps only)
- Show load state and enable / disable / retry actions per Section 11.2
- Add orphan app handling: show Disable for active orphans, Remove for
  inactive orphans; Remove calls `AppStore.remove(id)` (store + IndexedDB)
  and `appRegistry.delete(id)` (see Section 11.2)
- Add manifest source controls (display current source, edit, clear to default)
  with inline validation per Section 11.1
- Add manual catalog refresh button
- Verify: unloaded apps are visible; loaded apps show correct state;
  orphan apps show correct actions after catalog refresh

### Step 8 — Preserve existing rendering

- Confirm that Apps menu and panel regions still render only from loaded,
  active apps (no change needed if existing rendering reads from
  `AppResourceStore` and `AppStore.apps`)
- Verify: unloaded apps do not appear in Apps menu or panel tabs

## 14. Verification

### 14.1 Startup Footprint

With many apps in the manifest, startup must not fetch every remote entry.
Only persisted active apps may issue remote loading requests.

### 14.2 Restore Behavior

If an app was active in the previous session and still exists in the manifest,
it must be loaded automatically on startup.

If an app was inactive in the previous session, it must remain unloaded until
explicitly enabled.

### 14.3 First-Time Activation

If a user enables an unloaded app, the host must dynamically load and activate
the app in the current page without requiring host reload.

### 14.4 Activation Rollback

If first-time activation fails midway, partially registered resources must be
cleaned up and the app must not remain visible as active.

### 14.5 Deactivation Cleanup

If a loaded app is deactivated, host-managed resources must be removed and the
app lifecycle must be unmounted without requiring a full page reload.

### 14.6 Manifest Source Override

If the user sets a custom `manifestSource` (URL or uploaded file), that source
must be reused on the next startup until the user clears it. Clearing
`manifestSource` must revert to the default App Store URL.

### 14.7 Failure Isolation

Manifest failure or app load failure must not break the host application.

### 14.8 UI Consistency

The app manager must always show the manifest catalog, even when apps are
unloaded.

The Apps menu and panel regions must show only loaded active apps.

### 14.9 Retry

An app that fails to load must be retryable without reloading the host page.

### 14.10 Re-Enable Fast Path

If a loaded app is deactivated and then re-enabled in the same session, the
host must skip the network fetch and reuse the already-loaded remote module.

### 14.11 Catalog Refresh

A manual catalog refresh must update the available app list without
interrupting loaded, running apps. New apps must appear as available for
enable; removed apps must continue running until the session ends or the user
deactivates them.

### 14.12 Manifest Validation

Invalid manifest entries must be skipped without affecting valid entries. The
host must not crash on malformed manifests.

## 15. Summary

This design makes external app registration fully runtime-configurable while
avoiding eager startup cost.

The key architectural decisions are:

- store manifest source, catalog, and load states in AppStore
- keep apps reserved for loaded CyApp objects only
- use the default App Store manifest source unless the user sets a custom one
- use in-page dynamic first activation with rollback and immediate cleanup-based deactivation

This preserves existing rendering assumptions, supports App Store generated
catalogs with user override, supports persisted active app restore, and allows
the host to scale to large app catalogs without loading every remote at
startup.
