# Module Federation Extension Audit Report

**Rev. 1 (2/10/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**

An audit of the current Module Federation public API surface, identifying gaps and design issues that block third-party app development. The goal is to provide a well-designed API and developer environment that enables third-party developers to build apps comfortably on top of Cytoscape Web.

> Solution proposals for these issues are documented in [module-federation-design.md](module-federation-design.md).

---

## 1. Overview of the Problems

The current Module Federation infrastructure is at a **Proof of Concept** stage with these fundamental issues:

1. **Unsafe API surface from raw store exposure** — Internal stores are exposed directly, risking inconsistent state
2. **Missing high-level operation hooks** — Compound operations (create/delete nodes, run layout) are not exposed
3. **No distributable type definitions or SDK** — Types/docs exist only internally; third-party apps have no supported way to consume `.d.ts` contracts
4. **No event system** — No mechanism for inter-app communication or state change notifications
5. **Limited UI integration points** — Only Menu and Panel component types are supported
6. **Build-time app registration** — `apps.json` + `app-definition.ts` require a host rebuild for each new app

---

## 2. Current Architecture

### 2.1 Modules Exposed via Module Federation

Defined in **webpack.config.js** (ModuleFederationPlugin `exposes`):

#### Data Stores (12)

These are all raw zustand data stores.

| Module                  | File                                           | Purpose                    |
| ----------------------- | ---------------------------------------------- | -------------------------- |
| `./CredentialStore`     | `src/data/hooks/stores/CredentialStore.ts`     | Keycloak auth credentials  |
| `./LayoutStore`         | `src/data/hooks/stores/LayoutStore.ts`         | Layout algorithm settings  |
| `./MessageStore`        | `src/data/hooks/stores/MessageStore.ts`        | Notification messages      |
| `./NetworkStore`        | `src/data/hooks/stores/NetworkStore.ts`        | Network topology           |
| `./NetworkSummaryStore` | `src/data/hooks/stores/NetworkSummaryStore.ts` | Network metadata           |
| `./OpaqueAspectStore`   | `src/data/hooks/stores/OpaqueAspectStore.ts`   | Opaque aspects             |
| `./RendererStore`       | `src/data/hooks/stores/RendererStore.ts`       | Renderer config / viewport |
| `./TableStore`          | `src/data/hooks/stores/TableStore.ts`          | Node/edge attribute tables |
| `./UiStateStore`        | `src/data/hooks/stores/UiStateStore.ts`        | UI state                   |
| `./ViewModelStore`      | `src/data/hooks/stores/ViewModelStore.ts`      | Node positions / selection |
| `./VisualStyleStore`    | `src/data/hooks/stores/VisualStyleStore.ts`    | Visual styles              |
| `./WorkspaceStore`      | `src/data/hooks/stores/WorkspaceStore.ts`      | Workspace management       |

#### Task Hooks (2)

| Module                   | File                                        | Purpose                       |
| ------------------------ | ------------------------------------------- | ----------------------------- |
| `./CreateNetwork`        | `src/data/task/useCreateNetwork.tsx`        | Create network from edge list |
| `./CreateNetworkFromCx2` | `src/data/task/useCreateNetworkFromCx2.tsx` | Create network from CX2 data  |

### 2.2 Important Modules NOT Exposed

| Module                  | Severity     | Reason                                                     |
| ----------------------- | ------------ | ---------------------------------------------------------- |
| `RendererFunctionStore` | **Critical** | Holds camera control functions: `fit()`, `zoom()`, `pan()` |
| `FilterStore`           | High         | Network filtering operations                               |
| `AppStore`              | High         | App management, service app registration                   |
| `UndoStore`             | Medium       | Participation in undo/redo                                 |

### 2.3 DataStoreContext (Legacy Pattern)

`DataStore` interface in `src/features/AppManager/DataStore.ts`:

```typescript
interface DataStore {
  useWorkspaceStore: () => WorkspaceStore
  useNetworkStore: () => NetworkStore
}
```

This was effectively superseded by Module Federation but still exists, providing only **2 stores** to external apps. Needs cleanup.

---

## 3. Detailed API Gap Analysis

### 3.1 Network Operations — Critical Gap

#### Problem: Safe node/edge create/delete hooks are not exposed

Adding a node requires coordinating **6 stores**:

1. `NetworkStore.addNode()` — Topology update
2. `TableStore.addRows()` — Table row creation
3. `ViewModelStore.addNodeView()` — View generation
4. `VisualStyleStore` — Bypass handling (when needed)
5. `NetworkSummaryStore` — Metadata update
6. `UndoStore` — Undo history recording

Internally, `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges` hooks (`src/data/hooks/`) automate this, but **none are exposed**.

**Risks of direct store manipulation:**

- `NetworkStore.deleteNodes()` is marked `@deprecated` / `@internal`
- Direct calls skip cleanup of views, table rows, and visual style bypasses
- Leads to data inconsistency and memory leaks

#### Missing APIs:

| Operation        | Internal Hook        | Exposed? | Impact on External Apps                  |
| ---------------- | -------------------- | -------- | ---------------------------------------- |
| Add node         | `useCreateNode`      | **No**   | Must manually coordinate 6 stores        |
| Add edge         | `useCreateEdge`      | **No**   | Must manually coordinate 6 stores        |
| Delete nodes     | `useDeleteNodes`     | **No**   | Cannot cascade delete + cleanup          |
| Delete edges     | `useDeleteEdges`     | **No**   | Cannot cleanup bypasses                  |
| Delete network   | `useDeleteCyNetwork` | **No**   | Cannot safely remove from all stores     |
| Register network | `useRegisterNetwork` | **No**   | Cannot apply layout + register in stores |

### 3.2 Layout Operations — Critical Gap

#### Problem: Layout execution is completely unexposed

`LayoutStore` is exposed but **only allows configuration changes**. Actual layout execution requires:

1. `LayoutEngine.apply(nodes, edges, callback, algorithm)` — Run algorithm
2. `ViewModelStore.updateNodePositions()` — Update positions in callback
3. `RendererFunctionStore.getFunction('cyjs', 'fit')` — Fit viewport

Neither direct access to `LayoutEngine` objects nor a layout execution hook is exposed.

**Result:** External apps can set layout preferences but have no way to execute them.

### 3.3 Visual Style Operations — Partial Gap

`VisualStyleStore` is exposed, making these operations theoretically possible:

- Change default values (`setDefault`)
- Set bypasses / per-element overrides (`setBypass`)
- Create/modify mappings (discrete, continuous, passthrough)

**Problems:**

1. **`VisualPropertyName` enum is not exported** — No way to know valid property names
2. **`VisualPropertyValueType` types are not exported** — No way to know valid value types
3. **Mapping function structures are complex** — Impossible to construct without documentation
4. **`createContinuousMapping` auto-generates via statistics** — Convenient but hard to control

### 3.4 Camera / Viewport Control — Critical Gap

Because `RendererFunctionStore` is not exposed:

- `fit()` — Fit network to viewport → **Impossible**
- `zoom(factor)` — Change zoom → **Impossible**
- `pan(x, y)` — Pan viewport → **Impossible**
- Call custom renderer functions → **Impossible**

`RendererStore` is exposed with `setViewport()`, but this is for viewport **persistence**, not live control. Live control requires `RendererFunctionStore`.

### 3.5 Selection Operations — Available with Caveats

`ViewModelStore` is exposed with selection operations:

- `exclusiveSelect(networkId, nodeIds[], edgeIds[])` [Yes]
- `additiveSelect(networkId, ids[])` [Yes]
- `additiveUnselect(networkId, ids[])` [Yes]
- `toggleSelected(networkId, ids[])` [Yes]

**Problems:**

- No event notification on selection change (polling required)
- Node ID format convention (integer-based strings) is undocumented
- Edge ID `e` prefix convention is undocumented

### 3.6 Table (Attribute Data) Operations — Mostly Available

`TableStore` is exposed with:

- Column create/delete/rename [Yes]
- Cell value read/write [Yes]
- Batch updates [Yes]

**Problems:**

- `ValueTypeName` enum is not exported as a type
- Row ID (node/edge ID) mapping conventions are undocumented

---

## 4. Design Issues

### 4.1 Dangerous Raw Store Exposure

**Current design:** Internal Zustand stores exposed directly to external apps.

**Problems:**

- Any internal structure change is an immediate breaking change
- External apps can call arbitrary store actions, creating inconsistent state
- Destructive operations like `deleteAll()` are callable with no guard
- External developers must understand Immer proxy objects

### 4.2 Build-Time App Registration

**Current design:**

- Define in `src/assets/apps.json` → `webpack.config.js` reads it at build time and builds the `remotes` map.
- Manually add `import()` entries in `src/assets/app-definition.ts` (the runtime loader only loads apps present in this import map).

**Important implementation detail (currently undocumented in this audit):**

- `apps.json.url` is treated as the **full remote entry URL** (e.g. `https://.../remoteEntry.js`), not a base URL.
  - In `webpack.config.js` we set `externalAppsConfig[app.name] = `${app.name}@${app.url}``.
  - Several internal docs describe it as a base URL with `${url}/remoteEntry.js`, which does not match the current implementation.

**Problems:**

- Requires a Cytoscape Web rebuild for every new app
- `app-definition.ts` is a hardcoded import map; no dynamic addition
- Third parties cannot independently deploy and register apps

**Additional limitation (runtime):** even if an app is added to `apps.json`, it will not be loaded unless it is also listed in `appImportMap` in `app-definition.ts`.

### 4.3 Limited Component Types

**Current:** `ComponentType` supports only `Menu` and `Panel`.

**Missing integration points:**

| Type             | Use Case                          |
| ---------------- | --------------------------------- |
| `Toolbar`        | Add buttons/icons to toolbar      |
| `ContextMenu`    | Add right-click menu items        |
| `Dialog`         | Display modal dialogs             |
| `SidePanel`      | Add tabs in side panels           |
| `StatusBar`      | Display information in status bar |
| `NetworkOverlay` | Overlays on the network view      |

### 4.4 No Event / Notification System

**Current:** Store changes are only detectable via Zustand's `subscribeWithSelector`.

**Events external apps cannot detect:**

- Network switch
- Node/edge selection change
- Layout completion
- Network load completion
- Workspace changes
- Actions from other apps

### 4.5 Missing CX2 Validation

`useCreateNetworkFromCx2` does not validate CX2 input. It calls `createCyNetworkFromCx2(uuidv4(), cxData)`, and `createCyNetworkFromCx2` explicitly **does not validate** (it assumes the data is already valid).

**Note:** A validated conversion API _does_ exist (`getCyNetworkFromCx2`), which calls `validateCX2(cxData)` and throws on invalid input, but it is currently not used by this task hook. As a result, the policy violation and store-corruption risk still apply.

### 4.6 Uncontrollable Side Effects

`useCreateNetworkFromCx2` **unconditionally** performs:

- Adding network to workspace
- Switching current network
- URL navigation

External apps have no option to suppress these side effects.

### 4.7 Insufficient Error Handling

Task hook issues:

- `useCreateNetwork`: Only throws `Error` when a node is not found
- `useCreateNetworkFromCx2`: No error handling at all
- No explicit success/failure in return values
- No way for external apps to handle errors gracefully

### 4.8 Implicit Remote Contract (Undocumented, High Impact)

While this report correctly notes the lack of types/SDK, the current implementation also relies on multiple **implicit contracts** that are not written down in one place. These are key blockers for third-party developers because failures tend to surface as opaque Module Federation runtime errors.

**Implicit contracts required by the current host code:**

1. **Remote name must match** `apps.json.name` (used as Module Federation `scope`).
2. **Remote entry URL must be reachable** at `apps.json.url` (currently the full `remoteEntry.js` URL).
3. **Entry point module path must match** what `app-definition.ts` imports (e.g. `import('simpleMenu/SimpleMenuApp')`).
4. **The imported entry module must export a named `CyApp` object** whose export name matches `apps.json.entryPoint`.
5. **UI components must be exposed as separate modules** at `'./' + component.id` (e.g. `'./MyPanel'`), because the host lazy-loads them via `ExternalComponent(appId, './' + componentId)`.
6. **External apps must be compatible with the host's shared dependency policy** (`react`, `react-dom`, `@mui/material` are shared singletons and configured as `eager: true`). Version mismatches can lead to hard-to-debug runtime issues.

None of the above is currently represented as a single “contract” document for third-party developers.

---

## 5. Use Case Gap Matrix

How well the current API supports typical third-party app scenarios:

### Use Case A: Network Generator App

> Generate networks from external data sources and add to Cytoscape Web

| Operation                     | Status    | Method / Issue                                                    |
| ----------------------------- | --------- | ----------------------------------------------------------------- |
| Create network from edge list | [Yes]     | `useCreateNetwork`                                                |
| Create network from CX2       | [Partial] | `useCreateNetworkFromCx2` (no validation, no side-effect control) |
| Apply layout after creation   | [No]      | No layout execution API                                           |
| Apply style after creation    | [Partial] | Direct `VisualStyleStore` manipulation (complex, no type info)    |
| Fit to view after creation    | [No]      | `RendererFunctionStore` not exposed                               |

### Use Case B: Custom Layout Algorithm App

> Implement and apply custom layout algorithms

| Operation                     | Status | Method / Issue                                    |
| ----------------------------- | ------ | ------------------------------------------------- |
| Read current network topology | [Yes]  | `NetworkStore`                                    |
| Compute node positions        | [Yes]  | External computation                              |
| Batch update node positions   | [Yes]  | `ViewModelStore.updateNodePositions()`            |
| Fit viewport                  | [No]   | `RendererFunctionStore` not exposed               |
| Register as layout engine     | [No]   | `LayoutStore.layoutEngines` not directly writable |

### Use Case C: Style Modification App

> Dynamically change visual styles based on data

| Operation                      | Status    | Method / Issue                            |
| ------------------------------ | --------- | ----------------------------------------- |
| Map node color to data         | [Partial] | API exists but no type info               |
| Map edge width continuously    | [Partial] | Same                                      |
| Set bypass on individual nodes | [Partial] | `setBypass()` exists but VP names unknown |
| Save / restore styles          | [No]      | No style export/import mechanism          |

### Use Case D: Analysis / Annotation App

> Perform network analysis and write results as attributes

| Operation                            | Status    | Method / Issue                          |
| ------------------------------------ | --------- | --------------------------------------- |
| Read node/edge attributes            | [Yes]     | `TableStore`                            |
| Add new column                       | [Yes]     | `TableStore.createColumn()`             |
| Write analysis results to attributes | [Yes]     | `TableStore.setValue()` / `setValues()` |
| Select nodes based on results        | [Yes]     | `ViewModelStore.exclusiveSelect()`      |
| Style based on results               | [Partial] | No type info                            |

### Use Case E: Data Import/Export App

> Import and export data in various formats

| Operation            | Status    | Method / Issue                     |
| -------------------- | --------- | ---------------------------------- |
| Import CX2           | [Partial] | No validation                      |
| Import custom format | [Partial] | Only edge list supported           |
| Read network data    | [Yes]     | Available from stores              |
| Export to CX2        | [No]      | `exportCyNetworkToCx2` not exposed |
| Export as image      | [No]      | No renderer function access        |

### Use Case F: Graph Structure Modification App

> Modify the topology of an existing network in the current workspace (add/remove nodes and edges)

| Operation                          | Status    | Method / Issue                                                                      |
| ---------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| Get current network ID             | [Yes]     | `WorkspaceStore.currentNetworkId`                                                   |
| Read existing topology             | [Yes]     | `NetworkStore.networks`                                                             |
| Add nodes to existing network      | [No]      | `useCreateNode` not exposed; direct `NetworkStore` skips 5 other stores             |
| Add edges to existing network      | [No]      | `useCreateEdge` not exposed; same multi-store coordination problem                  |
| Delete nodes (with cascade)        | [No]      | `useDeleteNodes` not exposed; `NetworkStore.deleteNodes()` is deprecated and unsafe |
| Delete edges                       | [No]      | `useDeleteEdges` not exposed; bypasses and table rows left orphaned                 |
| Modify node/edge attributes        | [Yes]     | `TableStore.setValue()` / `setValues()`                                             |
| Update visual style after mutation | [Partial] | `VisualStyleStore` exposed but no type info for VP names                            |
| Fit viewport after changes         | [No]      | `RendererFunctionStore` not exposed                                                 |

This is the most impacted use case. The core graph mutation operations (add/delete nodes and edges) all require coordinated multi-store updates that are only available through unexposed internal hooks. Direct store manipulation risks data inconsistency (orphaned table rows, stale views, broken undo history).

### Use Case G: LLM Agent-Driven Network Generation App

> A CLI-based LLM agent generates networks and pushes them into Cytoscape Web through a relay Client App running in the browser. The relay app receives commands (e.g. via WebSocket) and translates them into store operations.

| Operation                               | Status    | Method / Issue                                                     |
| --------------------------------------- | --------- | ------------------------------------------------------------------ |
| Create network from agent-generated CX2 | [Partial] | `useCreateNetworkFromCx2` (no validation, no side-effect control)  |
| Incrementally add nodes                 | [No]      | `useCreateNode` not exposed; no batch-capable element creation API |
| Incrementally add edges                 | [No]      | `useCreateEdge` not exposed; same multi-store coordination gap     |
| Set node/edge attributes from agent     | [Yes]     | `TableStore.setValue()` / `setValues()`                            |
| Apply layout after generation           | [No]      | No layout execution API                                            |
| Apply style based on agent output       | [Partial] | `VisualStyleStore` exposed but no type info                        |
| Fit viewport after generation           | [No]      | `RendererFunctionStore` not exposed                                |
| Return operation results to agent       | [No]      | No structured result types; agent cannot detect success or failure |

This use case combines gaps from Use Cases A and F. The additional challenge is that LLM agents operate iteratively — they send commands, inspect results, and adjust. Without structured `ApiResult` return types and error codes, the relay app cannot provide meaningful feedback to the agent.

---

## 6. App Type Comparison

| Aspect           | Client App (Module Federation)   | Service App (REST)                  |
| ---------------- | -------------------------------- | ----------------------------------- |
| Execution        | In-browser (same JS context)     | Remote server                       |
| UI               | Custom React components          | Auto-generated parameter UI by host |
| Communication    | Direct Zustand store access      | HTTP POST/GET (polling)             |
| Result handling  | Arbitrary store operations       | 7 predefined action types           |
| Integration      | Menu, Panel                      | Menu (auto-generated)               |
| Development cost | High (must understand internals) | Low (REST API only)                 |
| Flexibility      | High (unrestricted)              | Low (limited to actions)            |
| Security         | Low (no sandbox)                 | High (HTTP boundary)                |

**Service App Actions (7):**

1. `addNetworks` — Add networks
2. `updateNetwork` — Update network
3. `addTables` — Add tables (**unimplemented stub**)
4. `updateTables` — Update tables
5. `updateSelection` — Update selection
6. `updateLayouts` — Update layouts
7. `openURL` — Open URL

Note: `addTables` is an **unimplemented stub** (empty function).

---

## 7. Known Implementation Bugs

| #   | Type                        | Location                                 | Description                                                                      |
| --- | --------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Missing validation          | `useCreateNetworkFromCx2`                | Uses `createCyNetworkFromCx2` (non-validating) instead of `getCyNetworkFromCx2`  |
| 2   | Unimplemented stub          | `ServiceApps/resultHandler/addTables.ts` | `addTables` action is an empty function                                          |
| 3   | Legacy code                 | `DataStore.ts` / `DataStoreProvider.tsx` | Old Context API superseded by Module Federation                                  |
| 4   | No side-effect control      | `useCreateNetworkFromCx2`                | Navigation / workspace ops are unconditional                                     |
| 5   | Deprecated API exposed      | `NetworkStore`                           | `deleteNodes()`/`deleteEdges()` are `@deprecated` but callable externally        |
| 6   | Undocumented ID conventions | Global                                   | Node IDs (integer strings) and edge IDs (`e` prefix) are not documented anywhere |

---

## 8. Files Investigated

### Module Federation Configuration

- `webpack.config.js`
- `src/assets/apps.json`
- `src/assets/app-definition.ts`

### Task Hooks (Exposed)

- `src/data/task/useCreateNetwork.tsx`
- `src/data/task/useCreateNetworkFromCx2.tsx`

### Wrapper Hooks (Not Exposed)

- `src/data/hooks/useCreateNode.ts`
- `src/data/hooks/useCreateEdge.ts`
- `src/data/hooks/useDeleteNodes.ts`
- `src/data/hooks/useDeleteEdges.ts`
- `src/data/hooks/useRegisterNetwork.ts`
- `src/data/hooks/useDeleteCyNetwork.ts`
- `src/data/hooks/useUndoStack.tsx`

### Stores (Exposed)

- `src/data/hooks/stores/NetworkStore.ts`
- `src/data/hooks/stores/TableStore.ts`
- `src/data/hooks/stores/VisualStyleStore.ts`
- `src/data/hooks/stores/ViewModelStore.ts`
- `src/data/hooks/stores/LayoutStore.ts`
- `src/data/hooks/stores/WorkspaceStore.ts`
- `src/data/hooks/stores/UiStateStore.ts`
- `src/data/hooks/stores/RendererStore.ts`
- `src/data/hooks/stores/NetworkSummaryStore.ts`
- `src/data/hooks/stores/OpaqueAspectStore.ts`
- `src/data/hooks/stores/CredentialStore.ts`
- `src/data/hooks/stores/MessageStore.ts`

### Stores (Not Exposed)

- `src/data/hooks/stores/RendererFunctionStore.ts`
- `src/data/hooks/stores/AppStore.ts`
- `src/data/hooks/stores/FilterStore.ts`
- `src/data/hooks/stores/UndoStore.ts`

### ServiceApps Feature Module

- `src/features/ServiceApps/index.ts`
- `src/features/ServiceApps/model/index.ts`
- `src/features/ServiceApps/api/index.ts`
- `src/features/ServiceApps/resultHandler/serviceResultHandlerManager.ts`
- `src/features/ServiceApps/resultHandler/addNetworks.ts`
- `src/features/ServiceApps/resultHandler/updateNetwork.ts`
- `src/features/ServiceApps/resultHandler/updateTables.ts`
- `src/features/ServiceApps/resultHandler/updateSelection.ts`
- `src/features/ServiceApps/resultHandler/updateLayouts.ts`
- `src/features/ServiceApps/resultHandler/addTables.ts`
- `src/features/ServiceApps/resultHandler/openURL.ts`

### AppManager Feature Module

- `src/features/AppManager/DataStore.ts`
- `src/features/AppManager/DataStoreContext.tsx`
- `src/features/AppManager/DataStoreProvider.tsx`
- `src/features/AppManager/ExternalComponent.tsx`

### Model Definitions

- `src/models/AppModel/CyApp.ts`
- `src/models/AppModel/ComponentMetadata.ts`
- `src/models/AppModel/ComponentType.ts`
- `src/models/AppModel/ServiceApp.ts`
- `src/models/AppModel/ServiceAppAction.ts`
- `src/models/StoreModel/NetworkStoreModel.ts`
- `src/models/StoreModel/TableStoreModel.ts`
- `src/models/StoreModel/VisualStyleStoreModel.ts`
- `src/models/StoreModel/ViewModelStoreModel.ts`
- `src/models/StoreModel/LayoutStoreModel.ts`
- `src/models/StoreModel/WorkspaceStoreModel.ts`
- `src/models/StoreModel/UiStateStoreModel.ts`
