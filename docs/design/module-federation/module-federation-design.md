# Module Federation Facade API Design and Priorities

**Rev. 3 (2/21/2026): Keiichiro ONO and Claude Code w/ Opus 4.6** - Updated for new Event Bus

Solution proposals for the issues identified in [module-federation-audit.md](module-federation-audit.md).

---

## 1. Priorities

### P0 (Blockers — App development is impossible without these)

#### 1.1 Design and Implement Facade API Layer

The primary public API for external apps is a **facade layer** (`src/app-api/`) with two access
paths:

- **Module Federation hooks** (`use<Domain>Api`) — React apps import from `cyweb/ElementApi` etc.
- **`window.CyWebApi` global** — Vanilla JS consumers (browser extensions, LLM agent bridges)
  access the same operations without React or a bundler.

Both paths execute the same domain logic, which lives in framework-agnostic core functions at
`src/app-api/core/`. See [ADR 0003](../../adr/0003-framework-agnostic-core-layer.md) for the
rationale and [facade-api-specification.md](specifications/facade-api-specification.md) for the full design.

**Two-layer architecture:**

```
src/app-api/core/<domain>Api.ts   ← framework-agnostic functions (no React, uses .getState())
src/app-api/use<Domain>Api.ts     ← React Hook wrapper: returns core object (thin, ~1 line)
```

Instead of directly exposing individual internal hooks or raw stores, the facade provides:

- A **stable public contract** independent of internal store implementation
- **Validated, typed operations** with consistent `ApiResult<T>` returns
- Coverage for all critical gaps identified in the audit (element CRUD, layout execution, viewport
  control, CX2 export)
- **Framework-agnostic access** enabling non-React consumers without duplication

Core functions coordinate stores directly via `useXxxStore.getState()`, replicating the logic of
existing internal hooks (`useCreateNode`, `useCreateEdge`, etc.) without calling them. External apps
import from facade modules:

```
cyweb/ElementApi      → Node/edge CRUD
cyweb/NetworkApi      → Network lifecycle
cyweb/SelectionApi    → Selection operations
cyweb/TableApi        → Table data operations
cyweb/VisualStyleApi  → Visual style operations
cyweb/LayoutApi       → Layout execution
cyweb/ViewportApi     → Viewport control
cyweb/ExportApi       → CX2 export
cyweb/ApiTypes        → Shared types (ApiResult, ApiErrorCode, re-exported model types)
window.CyWebApi       → Same operations, globally accessible (no Module Federation required)
```

Internal hooks and stores needed by the facade but not currently exposed (e.g.,
`RendererFunctionStore` for viewport control, layout execution coordination) are used internally by
the facade — they are NOT independently exposed via Module Federation. This ensures external apps
have a single, well-designed entry point and are insulated from internal refactoring.

#### 1.2 Deprecate Raw Store Exposure

The existing 12 raw store exports and 2 legacy task hooks remain available for backward compatibility but are marked `@deprecated`. New external apps should use the facade API exclusively. See [facade-api-specification.md § 2.4](specifications/facade-api-specification.md) for the deprecation timeline.

### P1 (Important — Needed for practical app development)

#### 1.3 Utilize Existing Type Definitions Package

The `@cytoscape-web/types` package (currently v1.1.15, published from `src/models/`) already provides most domain model types needed by external apps, including:

- `IdType`, `VisualPropertyName`, `ValueTypeName`
- `CyNetwork`, `Network`, `Node`, `Edge` interfaces
- `VisualStyle`, `VisualProperty`, mapping function types
- `Table`, `Column`, `AttributeName`, `ValueType` interfaces
- Store model type definitions (13 of 16 stores via `StoreModel`)

However, **the facade API cannot directly depend on this package in its current state** due to four unresolved issues that would leak internal dependencies, omit required types, or cause install failures for external app consumers:

1. **Missing `Cx2` types** — `CxModel` is currently excluded from both `index.ts` and `tsconfig.json`. The `CxModel/Cx2/` subdirectory contains pure type definitions with no external dependencies and must be exported, since the facade `NetworkApi` requires the `Cx2` type.
2. **Missing store model definitions** — `StoreModel/index.ts` is missing exports for `UndoStoreModel` (file exists but not re-exported), `RendererFunctionStoreModel`, and `FilterStoreModel` (files do not exist).
3. **Undeclared peer dependencies** — `RendererModel/Renderer.ts` imports `ReactElement` from `react` and `StoreModel/CredentialStoreModel.ts` imports `Keycloak` from `keycloak-js`. These must be declared as `peerDependencies` in the package to prevent install failures for consumers.
4. **`impl/` leakage in barrel exports** — Six model `index.ts` files re-export from `./impl/` (`CyNetworkModel`, `FilterModel`, `NetworkModel`, `TableModel`, `VisualStyleModel`, `ViewModel`), but `tsconfig.json` excludes `impl/`. TypeScript still compiles these transitively, pulling in external dependencies (`debug`, `cytoscape`, `d3-scale`). These barrel exports need to be split so that type-only interfaces are exported from non-impl files, and implementation functions (`*Fn` default exports, `getBasicFilter`, etc.) are excluded from the types build.

**Mitigation: Curated re-export via `ElementTypes.ts`**

To decouple the facade API's public type surface from these package-level issues, the facade introduces `src/app-api/types/ElementTypes.ts` — a curated re-export module that imports directly from `src/models/` source files (not the published package) and re-exports only the types external apps need. This provides three concrete benefits:

- **Transitive dependency isolation** — All model interfaces are re-exported with `export type`, which TypeScript erases at compile time. Runtime-bearing `as const` objects (`ValueTypeName`, `VisualPropertyName`) are self-contained with no external dependencies. This eliminates the `impl/` leakage problem (issue 4) without requiring barrel export refactoring.
- **Controlled public surface** — Only ~16 selected types are exposed, compared to 100+ types in the package's `export *` barrel. Internal types (`GraphObject`, `OpaqueAspects`, `UndoRedoStack`, view model internals) are explicitly excluded. See [ADR 0002](../../../docs/adr/0002-public-type-reexport-strategy.md) for the full inclusion/exclusion rationale.
- **Transparent migration path** — `ElementTypes.ts` acts as an indirection layer. Once the package issues above are resolved, the import sources can be switched from `../../models/...` to `@cytoscape-web/types` without any change to the external app import path (`cyweb/ApiTypes`).

External apps import all public types from a single Module Federation entry:

```typescript
import type { ApiResult, IdType, Network, Node, Edge } from 'cyweb/ApiTypes'
import { ApiErrorCode, ValueTypeName, VisualPropertyName } from 'cyweb/ApiTypes'
```

The `@cytoscape-web/types` package fixes (issues 1–4) remain tracked as P1 improvements. Once resolved, the curated re-export layer will delegate to the package, unifying the two type distribution mechanisms.

##### Publish `@cytoscape-web/api-types` Package

Vanilla JS consumers (browser extension developers, LLM agent bridge authors) who cannot use
Module Federation need TypeScript declarations for `window.CyWebApi`. A lightweight
`@cytoscape-web/api-types` npm package will publish:

- Ambient declarations for `window.CyWebApi` (all 8 domain API interface types)
- `ApiResult<T>`, `ApiErrorCode`, and public helper type signatures
- Re-exported public model types (same surface as `cyweb/ApiTypes`)

```typescript
// tsconfig.json: "types": ["@cytoscape-web/api-types"]
document.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi // typed as CyWebApiType
  const result = api.network.createNetworkFromEdgeList(edges)
})
```

The package is generated from the same `src/app-api/types/` sources as the runtime code,
keeping types synchronized with the implementation. This is a P1 quality-of-life item for
non-React consumers and does not block Phase 1 core implementation.

#### 1.4 Runtime Dynamic App Registration

Remove build-time dependency on `apps.json` + `app-definition.ts`:

- Runtime dynamic module loading (`new Function` or `importScripts` based)
- URL-based app registration UI
- Manifest validation

#### 1.5 Introduce Event Bus

External apps frequently need to react to state changes in Cytoscape Web — for example, updating a
side panel when the user changes their selection, or triggering an analysis when a new network is
loaded. Polling stores is fragile and inefficient; a typed event bus solves this cleanly.

**Design rationale: `window.dispatchEvent` with `CustomEvent`**

The event bus uses the browser's native `CustomEvent` API dispatched on `window`. This design was
chosen over a pub/sub library or a React Context approach for three concrete reasons:

1. **Zero-dependency universality** — Both React apps (via a thin hook wrapper) and Vanilla JS
   consumers (browser extensions, LLM agent bridges, server-side runners) listen with the same
   `window.addEventListener` call. No bundler, no React, no Module Federation required.
2. **Module boundary transparency** — `CustomEvent` on `window` is visible across all script
   contexts on the page, including iframes and browser extension content scripts. A shared singleton
   object passed through Module Federation would not reach these consumers.
3. **Browser DevTools observability** — Custom events appear in the Chrome DevTools Event Listeners
   panel, making it straightforward to debug event flow without additional instrumentation.

**Event type interface**

```typescript
// src/app-api/event-bus/CyWebEvents.ts
interface CyWebEvents {
  'network:created': { networkId: IdType }
  'network:deleted': { networkId: IdType }
  'network:switched': { networkId: IdType; previousId: IdType }
  'selection:changed': {
    networkId: IdType
    selectedNodes: IdType[]
    selectedEdges: IdType[]
  }
  'layout:started': { networkId: IdType; algorithm: string }
  'layout:completed': { networkId: IdType; algorithm: string }
  'style:changed': { networkId: IdType; property: string }
  'data:changed': { networkId: IdType; tableType: 'node' | 'edge'; rowIds: IdType[] }
}
```

**Internal architecture: Zustand subscriptions → `window.dispatchEvent`**

The event bus is initialized once in `src/init.tsx` after stores are ready. It subscribes to each
relevant Zustand store using `subscribeWithSelector` and dispatches a `CustomEvent` whenever the
watched state slice changes:

```typescript
// src/app-api/event-bus/initEventBus.ts (internal, not exposed)
export function initEventBus(): void {
  // Subscribe to workspace network IDs (network:created/network:deleted)
  useWorkspaceStore.subscribe(
    (state) => state.networkIds,
    (curr, prev) => {
      const prevSet = new Set(prev)
      const currSet = new Set(curr)
      for (const id of currSet) {
        if (!prevSet.has(id)) {
          dispatchCyWebEvent('network:created', { networkId: id })
        }
      }
      for (const id of prevSet) {
        if (!currSet.has(id)) {
          dispatchCyWebEvent('network:deleted', { networkId: id })
        }
      }
    },
  )

  // Subscribe to workspace current network ID (network:switched)
  useWorkspaceStore.subscribe(
    (state) => state.currentNetworkId,
    (networkId, previousId) => {
      if (networkId !== previousId) {
        dispatchCyWebEvent('network:switched', { networkId, previousId })
      }
    },
  )

  // Subscribe to selection of the current network view
  useViewModelStore.subscribe(
    (state) => ({
      networkId: useWorkspaceStore.getState().currentNetworkId,
      selectedNodes:
        state.viewModelMap.get(useWorkspaceStore.getState().currentNetworkId)
          ?.selectedNodes ?? [],
      selectedEdges:
        state.viewModelMap.get(useWorkspaceStore.getState().currentNetworkId)
          ?.selectedEdges ?? [],
    }),
    ({ networkId, selectedNodes, selectedEdges }) => {
      dispatchCyWebEvent('selection:changed', {
        networkId,
        selectedNodes,
        selectedEdges,
      })
    },
    { equalityFn: shallowEqual },
  )
  // ... other subscriptions (VisualStyleStore, TableStore)
}

function dispatchCyWebEvent<K extends keyof CyWebEvents>(
  type: K,
  detail: CyWebEvents[K],
): void {
  window.dispatchEvent(new CustomEvent(type, { detail }))
}
```

`initEventBus()` is called in `src/init.tsx` alongside `window.CyWebApi = CyWebApi`, ensuring
both are available at the same time. The function is internal and never exposed via Module
Federation.

The store subscription mapping above follows
[event-bus-specification.md](specifications/event-bus-specification.md), which is the source of
truth for detailed Event Bus behavior.

---

**Usage: React apps**

React apps import `useCyWebEvent` from `cyweb/EventBus`, a thin hook that wraps
`window.addEventListener` with automatic cleanup on unmount:

```typescript
// src/app-api/useCyWebEvent.ts  (exposed as cyweb/EventBus)
import { useEffect } from 'react'

export function useCyWebEvent<K extends keyof CyWebEvents>(
  eventType: K,
  handler: (detail: CyWebEvents[K]) => void,
): void {
  useEffect(() => {
    const listener = (e: Event) =>
      handler((e as CustomEvent<CyWebEvents[K]>).detail)
    window.addEventListener(eventType, listener)
    return () => window.removeEventListener(eventType, listener)
  }, [eventType, handler])
}
```

Minimal example — a panel that shows selected node count:

```typescript
import { useCyWebEvent } from 'cyweb/EventBus'
import { useState } from 'react'

export function SelectionPanel() {
  const [count, setCount] = useState(0)

  useCyWebEvent('selection:changed', ({ selectedNodes }) => {
    setCount(selectedNodes.length)
  })

  return <div>{count} node(s) selected</div>
}
```

For stable handler references (to avoid re-subscribing on every render), wrap the callback in
`useCallback`:

```typescript
const handleSelection = useCallback(({ selectedNodes }) => {
  setCount(selectedNodes.length)
}, [])

useCyWebEvent('selection:changed', handleSelection)
```

---

**Usage: Vanilla JS consumers**

Vanilla JS consumers use `window.addEventListener` directly. The recommended pattern is to wait
for the `cywebapi:ready` event — dispatched by `src/init.tsx` after both `window.CyWebApi` and
the event bus are initialized — before attaching listeners:

```javascript
// Browser extension content script or plain <script> tag
window.addEventListener('cywebapi:ready', () => {
  // Safe to use window.CyWebApi and attach event listeners here
  window.addEventListener('selection:changed', (e) => {
    const { networkId, selectedNodes, selectedEdges } = e.detail
    console.log(`Network ${networkId}: ${selectedNodes.length} nodes selected`)
  })

  window.addEventListener('network:switched', (e) => {
    const { networkId } = e.detail
    console.log('Active network changed to', networkId)
  })
})
```

For consumers who cannot wait for `cywebapi:ready` (e.g., they load after the app), check
`window.CyWebApi` synchronously and fall back to the event:

```javascript
function onApiReady(callback) {
  if (window.CyWebApi) {
    callback()
  } else {
    window.addEventListener('cywebapi:ready', callback, { once: true })
  }
}

onApiReady(() => {
  window.addEventListener('layout:completed', (e) => {
    console.log('Layout finished for network', e.detail.networkId)
  })
})
```

**TypeScript support for Vanilla JS consumers**

Install `@cytoscape-web/api-types` (P1 item, see § 1.3) and add it to `tsconfig.json`:

```json
{ "compilerOptions": { "types": ["@cytoscape-web/api-types"] } }
```

The package augments the global `WindowEventMap` so `window.addEventListener` is fully typed:

```typescript
// Automatically typed — no imports needed in the consuming file
window.addEventListener('selection:changed', (e) => {
  // e.detail is typed as { networkId: IdType; selectedNodes: IdType[]; selectedEdges: IdType[] }
  const { selectedNodes } = e.detail
})
```

The augmentation is declared inside the package as:

```typescript
// @cytoscape-web/api-types/global.d.ts
declare global {
  interface WindowEventMap extends CyWebEventMap {} // maps each key → CustomEvent<detail>
  interface Window {
    CyWebApi: CyWebApiType
  }
}
```

---

**Simplest end-to-end example**

The minimal setup for a new external React app that reacts to selection changes:

```typescript
// webpack.config.js (external app)
new ModuleFederationPlugin({
  remotes: { cyweb: 'cyweb@http://localhost:5500/remoteEntry.js' },
})

// SelectionCounter.tsx
import { useCyWebEvent } from 'cyweb/EventBus'
import { useState } from 'react'

export function SelectionCounter() {
  const [count, setCount] = useState(0)
  useCyWebEvent('selection:changed', ({ selectedNodes }) => setCount(selectedNodes.length))
  return <p>Selected: {count}</p>
}
```

For a Vanilla JS browser extension (no bundler):

```javascript
// content-script.js
window.addEventListener('cywebapi:ready', () => {
  window.addEventListener('selection:changed', (e) => {
    document.getElementById('badge').textContent = e.detail.selectedNodes.length
  })
})
```

Both examples listen to the same native browser event — no shared singleton, no React context,
no Module Federation required for the Vanilla JS case.

#### 1.6 Add CX2 Validation

Add `validateCX2()` to `useCreateNetworkFromCx2` to prevent store corruption from invalid data.

### P2 (Improvements — Better developer experience)

#### 1.7 Define App Lifecycle Contract

The current `CyApp` interface is purely declarative metadata (`id`, `name`, `components`). External apps have no supported lifecycle hooks for initialization or cleanup.

Add `mount(context)` and `unmount()` lifecycle callbacks to the app contract:

- **`mount(context)`** — Called when the app is activated. Receives an `AppContext` object providing access to all facade APIs. Use for initializing app state, registering event listeners, and preparing resources.
- **`unmount()`** — Called when the app is deactivated or unloaded. Apps must clean up DOM nodes, listeners, timers, and async tasks. No async work should survive past `unmount()`.

The `AppContext` type is exported via `cyweb/ApiTypes`. See [facade-api-specification.md § 1.5.9](specifications/facade-api-specification.md) for the full specification.

#### 1.8 Expand UI Integration Points

Add to `ComponentType`:

- `ContextMenu` — Right-click menu items
- `Toolbar` — Toolbar buttons
- `SidePanel` — Side panel tabs

**Context menu dynamic API:** In addition to registering a `ContextMenu` component type, apps need a runtime API for dynamically adding and removing individual menu items with associated callback functions (e.g., `useContextMenuApi().addItem(label, handler)`). The Multi-Scale Viewer app requires this for operations such as "Expand pathway" triggered from right-click on nodes.

#### 1.10 Developer Documentation and Templates

- API reference documentation
- Third-party app development guide
- Starter template (including webpack.config.js)
- Local development and debugging workflow

#### 1.11 Side-Effect Control Options

Add options parameter to task hooks:

```typescript
createNetworkFromCx2({
  cxData: cx2Data,
  options: {
    addToWorkspace: true, // default: true
    setAsCurrent: true, // default: true
    navigate: false, // default: true
    applyLayout: true, // default: true
    validate: true, // default: true
  },
})
```

#### 1.12 Expose CX2 Export

Add `exportCyNetworkToCx2` as a public task hook.

---

## 2. Implementation Roadmap

### Phase 1: Facade API Implementation and Example App Validation

> Full facade design and Module Federation integration details are in [facade-api-specification.md](specifications/facade-api-specification.md).
> Detailed type infrastructure design is in [phase1a-shared-types-design.md](specifications/phase1a-shared-types-design.md).
> Event bus detailed design is in [event-bus-specification.md](specifications/event-bus-specification.md).

Design the facade API surface first, then implement incrementally. Each sub-phase delivers working code with tests. **Example apps** in [cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples) are updated as validation targets alongside each API sub-phase. The phase is complete when multiple toy examples run end-to-end against the facade API.

The facade is the **only new public API** — internal hooks and stores are created or modified as needed to support the facade, but are not independently exposed.

#### Step 0: Foundation Types and Core Layer Structure

1. Define shared types (`ApiResult<T>`, `ApiErrorCode`) and public type re-exports
2. Create `src/app-api/types/` directory structure with barrel exports
3. Create `src/app-api/core/` directory with `index.ts` that assembles the `CyWebApi` object
4. Assign `window.CyWebApi = CyWebApi` in `src/init.tsx` after store initialization
5. Add `cyweb/ApiTypes` entry to `webpack.config.js`
6. Unit tests for `ApiResult` helpers (`ok`, `fail`, type guards)
7. Behavioral documentation (`src/app-api/api_docs/Api.md`)

> Design: [phase1a-shared-types-design.md](specifications/phase1a-shared-types-design.md) · ADRs: [0001](../../../docs/adr/0001-api-result-discriminated-union.md), [0002](../../../docs/adr/0002-public-type-reexport-strategy.md), [0003](../../../docs/adr/0003-framework-agnostic-core-layer.md)

#### Step 1: Facade Hook Implementation (5 sub-phases)

Each sub-phase produces: facade hook source → unit tests → webpack entry → behavioral docs.

Each sub-phase produces two files per domain: `src/app-api/core/<domain>Api.ts` (framework-agnostic
core functions) and `src/app-api/use<Domain>Api.ts` (thin React hook wrapper). Core function tests
use plain Jest; hook wrapper tests use `renderHook`.

**1a: Element API** (`core/elementApi.ts` + `useElementApi.ts`)

- Node/edge CRUD: `createNode`, `createEdge`, `deleteNodes`, `deleteEdges`, `getNode`, `getEdge`, `moveEdge`
- Coordinates stores via `.getState()` (mirrors logic of `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges`)

**1b: Network API** (`core/networkApi.ts` + `useNetworkApi.ts`)

- Network lifecycle: `createNetworkFromEdgeList`, `createNetworkFromCx2`, `deleteNetwork`
- Includes CX2 validation fix (P0 item 1.6)
- Coordinates stores via `.getState()` (mirrors logic of `useCreateNetworkWithView`, `useCreateNetworkFromCx2`)
- **Example validation**: Migrate `hello-world/CreateNetworkMenu` and `CreateNetworkFromCx2Menu` from raw stores/hooks to `useNetworkApi`

**1c: Selection + Viewport API** (`core/selectionApi.ts`, `core/viewportApi.ts` + hook wrappers)

- Selection: `exclusiveSelect`, `additiveSelect`, `toggleSelected`, `getSelection`
- Viewport: `fit`, `getNodePositions`, `updateNodePositions`
- **Example validation**: Add selection/viewport demo to `hello-world/HelloPanel`

**1d: Table + Visual Style API** (`core/tableApi.ts`, `core/visualStyleApi.ts` + hook wrappers)

- Table: `getValue`, `getRow`, `createColumn`, `setValue`, `setValues`
- Visual style: `setDefault`, `setBypass`, `createDiscreteMapping`, `createPassthroughMapping`
- **Example validation**: Update `simple-panel` to read/display table data via facade API

**1e: Layout + Export API** (`core/layoutApi.ts`, `core/exportApi.ts` + hook wrappers)

- Layout: `applyLayout`, `getAvailableLayouts`
- Export: `exportToCx2`
- After 1e: Update `src/app-api/core/index.ts` to assemble all 8 domain objects into `CyWebApi`
- **Example validation**: Create `network-generator` toy example (create → layout → fit → export)

#### Step 2: Event Bus

Implement the typed event bus alongside or immediately after all domain APIs are complete. The
event bus is tightly coupled to `src/init.tsx` and the core layer, making Phase 1 the right time
to ship it — external apps that use the facade API will immediately benefit from reactive event
subscriptions without polling.

**Deliverables:**

1. `src/app-api/event-bus/CyWebEvents.ts` — `CyWebEvents` interface (all 8 event types) +
   `dispatchCyWebEvent<K>` helper (calls `window.dispatchEvent(new CustomEvent(...))`)
2. `src/app-api/event-bus/initEventBus.ts` — Sets up one Zustand `subscribeWithSelector`
   subscription per domain; internal file, **not** exposed via Module Federation
3. `src/app-api/useCyWebEvent.ts` — React hook wrapper: `useEffect` + `addEventListener` +
   cleanup; exposed as `cyweb/EventBus`
4. `src/init.tsx` — Call `initEventBus()` immediately after `window.CyWebApi = CyWebApi`;
   dispatch `cywebapi:ready` as the last initialization step
5. `webpack.config.js` — Add `cyweb/EventBus` entry to `ModuleFederationPlugin.exposes`

**Tests:**

- Unit tests (`initEventBus.test.ts`) — mock `window.dispatchEvent` and verify each store
  mutation triggers the correct event type and detail payload (plain Jest, no `renderHook`)
- Hook test (`useCyWebEvent.test.ts`) — `renderHook` verifies the listener fires on
  `window.dispatchEvent` and is removed on unmount
- Integration smoke test — `cywebapi:ready` is dispatched after `window.CyWebApi` is assigned

**Example validation:** Update `hello-world/HelloPanel` to add a `SelectionCounter` component that
uses `useCyWebEvent('selection:changed', ...)` to display the live selected-node count. This is
the simplest end-to-end validation that the event bus is wired correctly.

#### Step 3: Webpack Integration and Deprecation

1. Add all 9 facade entries + `cyweb/EventBus` to `webpack.config.js`
   (`ModuleFederationPlugin.exposes`)
2. Mark existing 12 store exports and 2 task hooks `@deprecated` in JSDoc
3. Verify backward compatibility — existing examples still function with deprecated imports

#### Step 4: Example Repository Overhaul

Work in [cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples) on a `facade-api` branch:

1. **Update `hello-world`** — Full migration to facade API
   - `CreateNetworkMenu` → `useNetworkApi().createNetworkFromEdgeList` (replace `useCreateNetworkWithView` + `useWorkspaceStore`)
   - `CreateNetworkFromCx2Menu` → `useNetworkApi().createNetworkFromCx2`
   - `HelloPanel` → Use `useSelectionApi`, `useViewportApi` for interactive controls
2. **Update `simple-menu`** — Migrate menu actions to facade API
3. **Update `simple-panel`** — Migrate to `useTableApi`, `useSelectionApi`
4. **Create `network-generator` example** — New toy app demonstrating end-to-end workflow:
   - Create network from edge list → apply layout → set visual styles → fit viewport
   - Demonstrates: `useNetworkApi` + `useLayoutApi` + `useVisualStyleApi` + `useViewportApi`
5. **Update `project-template`** — Scaffold uses facade API imports, updated `remotes.d.ts` type declarations
6. **Update `patterns/` documentation** — Rewrite patterns to use facade API
7. **Update README.md** — Document facade API usage, deprecation notice for raw stores

#### Step 5: Bug Fixes

Fix existing bugs identified in the audit (Section 7). Addressed opportunistically as related facade hooks are implemented.

#### Phase 1 Exit Criteria

- [ ] All 8 `core/<domain>Api.ts` files implemented with plain Jest unit tests (no `renderHook`)
- [ ] All 8 `use<Domain>Api.ts` hook wrappers implemented (each ~1–5 lines)
- [ ] `window.CyWebApi` assigned in `src/init.tsx` and accessible after app load
- [ ] `src/app-api/core/` contains zero React imports (verified by linting or code review)
- [ ] `ApiResult<T>` and type re-exports verified via `cyweb/ApiTypes`
- [ ] `src/app-api/event-bus/initEventBus.ts` implemented; all 8 event types dispatch correctly
- [ ] `useCyWebEvent` hook exported via `cyweb/EventBus`; listener cleanup verified on unmount
- [ ] `cywebapi:ready` dispatched on `window` after `window.CyWebApi` is assigned
- [ ] `hello-world/HelloPanel` `SelectionCounter` demo works end-to-end via `useCyWebEvent`
- [ ] `hello-world` runs end-to-end using only facade API (no raw store imports)
- [ ] `network-generator` toy example creates, lays out, styles, and exports a network
- [ ] `simple-menu` and `simple-panel` run end-to-end using facade API
- [ ] Legacy store-based examples still function (backward compatibility)
- [ ] `project-template` updated for new developers to use facade API
- [ ] `patterns/` documentation reflects facade API usage

### Phase 2: Developer Experience

1. Dynamic app registration mechanism
2. API reference documentation (covering both `use<Domain>Api` hooks and `window.CyWebApi`)
3. Starter template
4. Chrome Extension bridge reference implementation (MCP Bridge Server + Adapter content script
   using `window.CyWebApi`)

### Phase 3: Extensibility

1. App Lifecycle contract (`AppContext`, `CyAppWithLifecycle`). `AppContext.apis` is assembled
   directly from the `window.CyWebApi` core objects — not constructed independently. Module
   Federation apps receive the same instances as vanilla JS consumers, eliminating the need for
   a separate React-context-based API assembly step.
2. Expand UI integration points
3. Expose CX2 export API
4. Inter-app communication protocol
5. Security sandbox evaluation

---

## 3. Timeline

### Phase 1: Facade API Implementation and Example Validation

- **Goal**: Implement facade API and validate with working toy examples end-to-end

| Milestone                     | Deliverables                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Step 0: Foundation types      | `ApiResult.ts`, `ElementTypes.ts`, barrel exports, unit tests, `cyweb/ApiTypes` webpack entry                                        |
| Step 1a: Element API          | `useElementApi.ts`, unit tests, `cyweb/ElementApi` webpack entry                                                                     |
| Step 1b: Network API          | `useNetworkApi.ts`, CX2 validation fix, unit tests, **first example migration** (`hello-world` CreateNetworkMenu)                    |
| Step 1c: Selection + Viewport | `useSelectionApi.ts`, `useViewportApi.ts`, unit tests, HelloPanel demo update                                                        |
| Step 1d: Table + Visual Style | `useTableApi.ts`, `useVisualStyleApi.ts`, unit tests, `simple-panel` migration                                                       |
| Step 1e: Layout + Export      | `useLayoutApi.ts`, `useExportApi.ts`, unit tests, `network-generator` example                                                        |
| Step 2: Event Bus             | `initEventBus.ts`, `useCyWebEvent.ts`, `cyweb/EventBus` entry, unit + hook tests, `cywebapi:ready` dispatch, `SelectionCounter` demo |
| Step 3: Integration           | Webpack config finalization, `@deprecated` markers, backward compatibility verification                                              |
| Step 4: Examples & Docs       | Example repo overhaul complete, `project-template` update, end-to-end validation, bug fixes                                          |

**Key dependencies:**

- Steps 1a–1e are sequential (each builds on shared types from Step 0)
- Example migrations in Step 3 begin incrementally after Step 1b (Network API is the minimum for `hello-world`)
- Parallel work: unit tests alongside implementation; example migration starts as APIs become available

**Milestones (checkpoints):**

| Checkpoint                | Verification                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------- |
| First toy example working | `hello-world/CreateNetworkMenu` creates a network via `useNetworkApi`                  |
| Core APIs complete        | All 8 facade hooks pass unit tests                                                     |
| Event bus live            | `SelectionCounter` in `hello-world/HelloPanel` reacts to selection via `useCyWebEvent` |
| E2E example suite         | `network-generator` runs full workflow (create → layout → style → export)              |
| Phase 1 complete          | All exit criteria met, `facade-api` branch ready for merge in examples repo            |

### Phase 2: Developer Experience (TBD)

### Phase 3: Extensibility (TBD)
