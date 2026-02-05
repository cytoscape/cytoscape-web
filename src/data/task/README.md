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

**Location:** `src/externalapps/useAppManager.ts`

A React hook that manages the lifecycle of external apps. It handles loading, registering, and monitoring the status of external apps defined in `apps.json` and `app-definition.ts`.

**Signature:**

```typescript
export const useAppManager = (): void
```

**What it does:**

1. **Initialization:** On mount, restores app states from IndexedDB cache
2. **Dynamic Loading:** Loads external app modules using the `appImportMap` from `app-definition.ts`
3. **Registration:** Registers successfully loaded apps to the `AppStore`
4. **Status Management:** Monitors app status and handles errors:
   - Registers apps that are loaded but not yet in the store
   - Sets status to `Error` for apps that fail to load
   - Reactivates apps that recover from error state

**Usage:**

```typescript
import { useAppManager } from './externalapps/useAppManager'

function WorkspaceEditor() {
  useAppManager() // Register dynamically loaded apps to the store
  // ... rest of component
}
```

**How it works:**

1. Reads `apps.json` to build a map of app names to entry points
2. Uses `appImportMap` from `app-definition.ts` to dynamically import remote modules
3. Extracts the `CyApp` object from each loaded module using the entry point name
4. Registers loaded apps with the `AppStore` via Zustand
5. Watches the app store for changes and manages app lifecycle accordingly

**Dependencies:**

- `apps.json` - Configuration for available apps
- `app-definition.ts` - Import map for apps to load
- `AppStore` - Zustand store for app state management
- `CyApp` interface - App metadata structure

**Note:** This hook should typically be called once at the top level of the workspace component to ensure external apps are loaded and registered when the workspace initializes.

### `useAppPanel`

**Location:** `src/externalapps/useAppPanel.ts`

A React hook that generates panel components from registered external apps. It scans all registered apps for panel-type components and creates lazy-loaded React components that can be rendered in the UI.

**Signature:**

```typescript
export const useAppPanel = (): any[]
```

**Returns:** An array of lazy-loaded React components (lazy component wrappers from external apps)

**What it does:**

1. **Scans Apps:** Iterates through all apps registered in the `AppStore`
2. **Finds Panels:** Identifies components with `type === 'panel'` in each app's `components` array
3. **Creates Components:** Generates lazy-loaded components using `ExternalComponent` helper
4. **Deduplication:** Tracks created panels to prevent duplicates

**Usage:**

```typescript
import { useAppPanel } from './externalapps/useAppPanel'

function SidePanel() {
  const panels = useAppPanel()

  return (
    <div>
      {panels.map((Panel, index) => (
        <Suspense key={index} fallback={<div>Loading panel...</div>}>
          <Panel />
        </Suspense>
      ))}
    </div>
  )
}
```

**Component Requirements:**

For an external app to contribute panels via this hook:

1. The app must be registered (via `useAppManager`)
2. The app's `CyApp.components` array must include entries with:
   - `type: 'panel'` (from `ComponentType.Panel`)
   - `id: string` - Unique identifier for the panel component
3. The remote module must export the panel component at the path `'./' + component.id`

**Example External App Configuration:**

```typescript
// In the external app's entry point
export const MyApp: CyApp = {
  id: 'myApp',
  name: 'My App',
  components: [
    {
      id: 'MyPanel',
      type: 'panel',
    },
  ],
}
```

The panel component should be exported from the external app's Module Federation remote at `'./MyPanel'`.

**Dependencies:**

- `AppStore` - Source of registered apps
- `ExternalComponent` - Helper for lazy loading remote components
- `ComponentMetadata` - Interface for component definitions

**Note:** This hook is currently not actively used in the codebase. The `TabContents.tsx` component uses a similar pattern directly. However, this hook provides a reusable abstraction for getting panel components from external apps.

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

External apps depend on configuration files located in `src/assets/`:

### `apps.json`

**Location:** `src/assets/apps.json`

Defines the list of external apps available to the host application. Used by both Webpack (at build time) and the runtime app manager to configure Module Federation remotes.

**Structure:**

```json
[
  {
    "name": "appName",
    "url": "https://example.com",
    "entryPoint": "AppEntry"
  }
]
```

**Fields:**

- `name` (string, required) - Unique identifier for the app. Used as the Module Federation remote name.
- `url` (string, required) - Base URL where the remote app is hosted. The Module Federation remote entry should be accessible at `${url}/remoteEntry.js`.
- `entryPoint` (string, required) - Name of the exported entry point in the remote module. This should correspond to the exported `CyApp` object.

**Usage:**

- **Build time:** Webpack uses this file to configure Module Federation remotes (`webpack.config.js`)
- **Runtime:** The app manager (`useAppManager.ts`) uses this to determine which apps to load and where to find them

### `apps-dev.json`

**Location:** `src/assets/apps-dev.json`

Development version of `apps.json` with development/staging URLs for external apps. This allows different app configurations for development and production environments.

**Structure:** Same as `apps.json`

**Note:** Currently this file exists but may not be actively used. The system uses `apps.json` in both environments.

### `app-definition.ts`

**Location:** `src/assets/app-definition.ts`

Contains the dynamic import map that defines which external apps should actually be loaded. Only apps registered in this file will be dynamically imported and initialized.

**Structure:**

```typescript
export const appImportMap = {
  appName: () => import('appName/AppEntry' as any),
  // other apps...
}
```

**How it works:**

1. The `appImportMap` object maps app names (matching `name` from `apps.json`) to dynamic import functions
2. These imports use Module Federation to load remote modules
3. Only apps with entries in `appImportMap` will be loaded and registered
4. The `useAppManager` hook uses this map to dynamically load apps at runtime

**Adding a new external app:**

1. **Add to `apps.json`:**

   ```json
   {
     "name": "myApp",
     "url": "https://myapp.example.com",
     "entryPoint": "MyAppEntry"
   }
   ```

2. **Add to `app-definition.ts`:**

   ```typescript
   export const appImportMap = {
     myApp: () => import('myApp/MyAppEntry' as any),
     // ... other apps
   }
   ```

3. **Ensure the remote app exposes the entry point:**
   - The remote app must export a `CyApp` object matching the `entryPoint` name
   - The remote app's `remoteEntry.js` must be accessible at `${url}/remoteEntry.js`

**Example:**

For an app configured as:

```json
{
  "name": "exampleApp",
  "url": "https://apps.example.com",
  "entryPoint": "ExampleApp"
}
```

The import map entry would be:

```typescript
exampleApp: () => import('exampleApp/ExampleApp' as any)
```

And the remote app should export:

```typescript
export const ExampleApp: CyApp = {
  id: 'exampleApp',
  name: 'Example App',
  components: [...],
  // ...
}
```
