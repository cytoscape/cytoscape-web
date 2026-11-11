# External Apps API

This folder contains hooks and utilities that are **exposed to external applications** via Webpack Module Federation.

## Exposed Hooks

### `useCreateNetwork`

**Module Path:** `cyweb/CreateNetwork`

A custom hook that creates a network from an edge list and stores it in Zustand. Returns a function that takes network creation parameters (name, description, edge list) and returns a `CyNetwork` object.

**Usage in External Apps:**

```typescript
const createNetwork = useCreateNetwork()
const cyNetwork = createNetwork({
  name: 'My Network',
  description: 'Network description',
  edgeList: [
    ['node1', 'node2'],
    ['node2', 'node3'],
  ],
})
```

### `useCreateNetworkFromCx2`

**Module Path:** `cyweb/CreateNetworkFromCx2`

A custom hook that creates a network from CX2 (Cytoscape Exchange 2) data and stores it in Zustand. Returns a function that takes CX2 data and returns a `CyNetwork` object.

**Usage in External Apps:**

```typescript
const createNetworkFromCx2 = useCreateNetworkFromCx2()
const cyNetwork = createNetworkFromCx2({
  cxData: cx2Data,
})
```

## App Management Hooks

The following hooks are used internally by the host application to manage external apps. They are not exposed to external apps via Module Federation, but are documented here for developers working on the host application.

### `useAppManager`

**Location:** `src/data/hooks/stores/useAppManager.ts`

A React hook that owns the lifecycle of external apps: it builds the catalog,
loads apps at startup, and returns the commands App Manager calls
(`activateApp`, `deactivateApp`, `retryApp`, `refreshCatalog`,
`setManifestSource`, `installApp`, `uninstallApp`, `removeOrphan`).
`AppShell` calls it once.

**What it does at startup:**

1. Fetches the catalog: the deployment's `apps.json` (see
   [Asset Files](#asset-files)), or the Manifest Source the user set.
2. Waits for the workspace to hydrate, then composes the catalog as the
   manifest plus the workspace's `installedApps`.
3. Seeds the session's app statuses with `startupAppStatus`
   (`src/models/AppModel/impl/startupAppStatus.ts`). Apps the workspace
   records as active start on. So do **core apps**, the entries of the
   deployment's own `apps.json`, unless the workspace records that the user
   turned them off.
4. Loads every app seeded on, in parallel, through `loadRemoteApp`, then
   registers and mounts each. An app whose `compatibleHostVersions` excludes
   this host is skipped and marked `incompatible-host` on its row. Failures
   are reported in one toast and kept on the app's row in App Manager, which
   keeps the app's switch so it can be turned off.

Turning a core app off writes an `inactive` record to the workspace, which is
what keeps it off at the next startup.

**Installing:** `installApp` compares the offered entry's version with the
catalog's entry for the same id, as semver. A newer version replaces the
installed one in place (a running app stays on); the same or an older version
is kept, and only turned on for an install link. It waits for the catalog to be
composed first, and activations of one app run one at a time, after its
startup load.

**Design:**
`docs/design/module-federation/specifications/workspace-app-install-design.md`
(§8) and `runtime-app-registration-specification.md` (§8–§10) in the same
folder.

## Configuration

These hooks are exposed through Webpack Module Federation in:

- `webpack.config.js` - exposes `./CreateNetwork` and `./CreateNetworkFromCx2`
- `webpack.config.new.js` - same configuration

External apps can consume these modules using Module Federation:

```typescript
import { useCreateNetwork } from 'cyweb/CreateNetwork'
import { useCreateNetworkFromCx2 } from 'cyweb/CreateNetworkFromCx2'
```

## Important Notes

1. **These hooks are only for external app consumption** - They are not used internally in the main codebase.
2. **Breaking changes** - Any changes to these hooks' APIs will affect external apps. Consider versioning if needed.
3. **Dependencies** - These hooks depend on Zustand stores (NetworkStore, TableStore, ViewModelStore, etc.) which are also exposed to external apps.

## Related Exposed Modules

The following stores are also exposed to external apps (see `webpack.config.js`):

- `CredentialStore`
- `LayoutStore`
- `MessageStore`
- `NetworkStore`
- `NetworkSummaryStore`
- `OpaqueAspectStore`
- `RendererStore`
- `TableStore`
- `UiStateStore`
- `ViewModelStore`
- `VisualStyleStore`
- `WorkspaceStore`

## Asset Files

### `apps.json`

**Location:** `src/assets/apps.json` (`[]` in the repository)

The deployment's app catalog. The build emits it at the root of `dist`
(`appsConfigPlugin` in `vite.config.ts`), and the app fetches it at runtime
from `<base>apps.json`, under the `urlBaseName` in `config.json`
(`DEFAULT_MANIFEST_URL` in `src/app-api/constants.ts`). A deployment's build
script copies its own list over this file; the dev server serves
`src/assets/apps.local.json` instead.

Every entry is a **core app**: it is on when Cytoscape Web starts, unless the
current workspace records that the user turned it off. See
`docs/design/module-federation/specifications/workspace-app-install-design.md`
§8.5.

**Structure:** an array of `AppCatalogEntry`
(`src/models/AppModel/AppCatalogEntry.ts`), validated by `parseManifest`
(`src/features/AppManager/manifest/parseManifest.ts`):

```json
[
  {
    "id": "networkAnalyzer",
    "name": "NetworkAnalyzer",
    "version": "1.0.0",
    "url": "https://apps-stage.cytoscape.org/web/networkanalyzer/1.0.0/remoteEntry.js",
    "author": "Christian Lopes"
  }
]
```

- `id` — the app's Module Federation name. It must be a JavaScript identifier
  and match the name the remote's build declares. When absent, `name` is used
  if it is a valid identifier.
- `url` — the full URL of the remote's `remoteEntry.js`.
- `name`, `author`, `description`, `version`, `tags`, `icon`, `license`,
  `repository`, `compatibleHostVersions` — optional metadata shown in App
  Manager.

The remote must expose `./AppConfig`, whose default export is the app's
`CyApp`. An entry that fails validation is skipped with a warning.
