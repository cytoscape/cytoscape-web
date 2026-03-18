# Module Federation App API Design and Priorities

**Rev. 4 (3/14/2026): Keiichiro ONO and Claude Code w/ Opus 4.6** - Added Phase 2 (App Resource Registration) roadmap

- Rev. 3 (2/21/2026): Keiichiro ONO and Claude Code w/ Opus 4.6 - Updated for new Event Bus

Solution proposals for the issues identified in [module-federation-audit.md](module-federation-audit.md).

---

## 1. Priorities

### P0 (Blockers — App development is impossible without these)

#### 1.1 Design and Implement App API Layer

The primary public API for external apps is a **app API layer** (`src/app-api/`) with two access
paths:

- **Module Federation hooks** (`use<Domain>Api`) — React apps import from `cyweb/ElementApi` etc.
- **`window.CyWebApi` global** — Vanilla JS consumers (browser extensions, LLM agent bridges)
  access the same operations without React or a bundler.

Both paths execute the same domain logic, which lives in framework-agnostic core functions at
`src/app-api/core/`. See [ADR 0003](../../adr/0003-framework-agnostic-core-layer.md) for the
rationale and [app-api-specification.md](specifications/app-api-specification.md) for the full design.

**Two-layer architecture:**

```
src/app-api/core/<domain>Api.ts   ← framework-agnostic functions (no React, uses .getState())
src/app-api/use<Domain>Api.ts     ← React Hook wrapper: returns core object (thin, ~1 line)
```

Instead of directly exposing individual internal hooks or raw stores, the app API provides:

- A **stable public contract** independent of internal store implementation
- **Validated, typed operations** with consistent `ApiResult<T>` returns
- Coverage for all critical gaps identified in the audit (element CRUD, layout execution, viewport
  control, CX2 export)
- **Framework-agnostic access** enabling non-React consumers without duplication
- An **evergreen versioning strategy** (no version numbers in paths, additive changes only) ensuring long-term backward compatibility

Core functions coordinate stores directly via `useXxxStore.getState()`, replicating the logic of
existing internal hooks (`useCreateNode`, `useCreateEdge`, etc.) without calling them. External apps
import from app API modules:

```
cyweb/ElementApi      → Node/edge CRUD
cyweb/NetworkApi      → Network lifecycle
cyweb/SelectionApi    → Selection operations
cyweb/TableApi        → Table data operations
cyweb/VisualStyleApi  → Visual style operations
cyweb/LayoutApi       → Layout execution
cyweb/ViewportApi     → Viewport control
cyweb/ExportApi       → CX2 export
cyweb/WorkspaceApi    → Workspace state (current network, network list, rename workspace)
cyweb/ApiTypes        → Shared types (ApiResult, ApiErrorCode, re-exported model types)
window.CyWebApi       → Same operations, globally accessible (no Module Federation required)
```

Internal hooks and stores needed by the app API but not currently exposed (e.g.,
`RendererFunctionStore` for viewport control, layout execution coordination) are used internally by
the app API — they are NOT independently exposed via Module Federation. This ensures external apps
have a single, well-designed entry point and are insulated from internal refactoring.

#### 1.2 Deprecate Raw Store Exposure

The existing 12 raw store exports and 2 legacy task hooks remain available for backward compatibility but are marked `@deprecated`. New external apps should use the app API exclusively. See [app-api-specification.md § 2.4](specifications/app-api-specification.md) for the deprecation timeline.

### P1 (Important — Needed for practical app development)

#### 1.3 ~~Utilize Existing Type Definitions Package~~ (Superseded)

> **Status: Superseded by Phase 0 delivery (February 2026).**
>
> `@cytoscape-web/types` has been **deprecated** in favour of
> [`@cytoscape-web/api-types`](https://www.npmjs.com/package/@cytoscape-web/api-types)
> (published as part of Phase 0). The P1 fixes described below are no longer needed
> because `@cytoscape-web/api-types` was built from scratch with a curated, dependency-safe
> type surface. Run the following to mark the old package as deprecated on the registry:
>
> ```bash
> npm deprecate "@cytoscape-web/types" \
>   "Deprecated: use @cytoscape-web/api-types instead. See https://www.npmjs.com/package/@cytoscape-web/api-types"
> ```

~~The `@cytoscape-web/types` package (currently v1.1.15, published from `src/models/`) already provides most domain model types needed by external apps.~~

~~However, **the app API cannot directly depend on this package in its current state** due to four unresolved issues:~~

1. ~~**Missing `Cx2` types**~~
2. ~~**Missing store model definitions**~~
3. ~~**Undeclared peer dependencies**~~
4. ~~**`impl/` leakage in barrel exports**~~

**Resolution: Curated re-export via `ElementTypes.ts` + `@cytoscape-web/api-types`**

The app API introduces `src/app-api/types/ElementTypes.ts` — a curated re-export module
that imports directly from `src/models/` source files and re-exports only the types external
apps need. The `@cytoscape-web/api-types` npm workspace package (`packages/api-types/`) wraps
this surface with additional event bus declarations and ambient `window.CyWebApi` augmentations.

External apps import all public types from either:

```typescript
// Via Module Federation (React app consumers)
import type { ApiResult, IdType, Network, Node, Edge } from 'cyweb/ApiTypes'
import { ApiErrorCode, ValueTypeName, VisualPropertyName } from 'cyweb/ApiTypes'

// Via npm (vanilla JS / browser extension consumers)
// npm install @cytoscape-web/api-types@alpha
import type { CyWebApiType, CyWebEvents } from '@cytoscape-web/api-types'
```

See [ADR 0002](../../../docs/adr/0002-public-type-reexport-strategy.md) for the full
inclusion/exclusion rationale.

##### Publish `@cytoscape-web/api-types` Package

> **Priority: P0 — Phase 0 deliverable.** Unlike the `@cytoscape-web/types` fixes above (P1),
> this package publication is required before Phase 1 begins. See
> [implementation-checklist-phase0.md](../checklists/implementation-checklist-phase0.md).

Vanilla JS consumers (browser extension developers, LLM agent bridge authors) who cannot use
Module Federation need TypeScript declarations for `window.CyWebApi`. A lightweight
`@cytoscape-web/api-types` npm package will publish:

- Ambient declarations for `window.CyWebApi` (all 8 domain API interface types)
- `ApiResult<T>`, `ApiErrorCode`, and public helper type signatures
- Re-exported public model types (same surface as `cyweb/ApiTypes`)

```typescript
// tsconfig.json: "types": ["@cytoscape-web/api-types"]
window.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi // typed as CyWebApiType
  const result = api.network.createNetworkFromEdgeList(edges)
})
```

The package is generated from the same `src/app-api/types/` sources as the runtime code,
keeping types synchronized with the implementation. Publishing this package is a **Phase 0
deliverable**: once the public type surface in `src/app-api/types/` is finalized, the package
is released as `0.1.0-alpha.0` before Phase 1 begins.

**Repository structure (npm workspaces):**

```
packages/
└── api-types/
    ├── package.json      # name: "@cytoscape-web/api-types", version: "0.1.0-alpha.0"
    ├── tsconfig.json     # re-exports src/app-api/types/ + ambient global declarations
    └── dist/             # generated .d.ts files (gitignored)
```

The root `package.json` declares `"workspaces": ["packages/*"]`. A `build:api-types` script
in the root produces the `dist/` artifacts from the workspace package's build step.

> **Status:** Not yet published. See [implementation-checklist-phase0.md](../checklists/implementation-checklist-phase0.md)
> for the publication steps. Until published, vanilla JS consumers can declare a minimal ambient
> type locally (see app-api-specification.md § 2.7).

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
  'data:changed': {
    networkId: IdType
    tableType: 'node' | 'edge'
    rowIds: IdType[]
  }
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

`initEventBus()` is called in `src/features/AppShell.tsx` after stores hydrate from IndexedDB,
ensuring that Zustand subscriptions do not fire spurious `network:created` events for
previously-persisted networks. `window.CyWebApi` is assigned earlier in `src/init.tsx` (before
React renders), but the event bus and `cywebapi:ready` are deferred to `AppShell`. The function
is internal and never exposed via Module Federation.

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
for the `cywebapi:ready` event — dispatched by `AppShell.tsx` after both `window.CyWebApi` and
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

#### 1.7 ~~Define App Lifecycle Contract~~ (Promoted to Phase 1 Step 1g)

> **Status: Promoted to Phase 1.**
>
> App Lifecycle (`mount`/`unmount`) has been moved from P2/Phase 3 to **Phase 1 Step 1g** because:
>
> - `AppContext.apis` is simply `window.CyWebApi` — no React context or separate instantiation needed
> - All domain APIs are assembled by Phase 1f, making lifecycle wiring straightforward at that point
> - External apps cannot perform meaningful initialization without a lifecycle hook
>
> See [implementation-checklist-phase1.md § Phase 1g](../checklists/implementation-checklist-phase1.md)
> and [app-api-specification.md § 1.5.9](specifications/app-api-specification.md) for details.

#### 1.8 App Resource Runtime Registration

> **Status: Detailed design complete.** See [app-resource-registration-specification.md](specifications/app-resource-registration-specification.md) for the full design. Implementation checklist: [implementation-checklist-phase2.md](checklists/implementation-checklist-phase2.md).

Replace the manifest-only `CyApp.components` extension model with a **runtime registration API** for panels and app menu items. The current model forces app authors to declare resources in two places (app manifest and component code) and makes panels/menu items behave differently from context menus (which are already runtime-registered).

**Key design decisions:**

- **Slot model:** `slot: ResourceSlot` (`'right-panel'` | `'apps-menu'`) replaces `kind: 'panel' | 'menu'`, so new UI locations can be added as new slot values without redesigning the registry
- **Per-app factory:** `createResourceApi(appId)` binds `appId` at construction, preventing cross-app resource spoofing; same pattern applied to `contextMenuApi`
- **Upsert semantics:** `registerPanel` / `registerMenuItem` silently replace existing resources with the same `(appId, slot, id)` triple, avoiding flicker
- **Extensible cleanup:** `AppCleanupRegistry` lets each store register its own cleanup function — `appLifecycle.ts` calls `cleanupAllForApp(appId)` once regardless of how many stores exist
- \*\*Declarative `resources` field: `CyAppWithLifecycle.resources`` provides a zero-boilerplate path for apps with fixed resources (no `mount()` needed)
- **`AppIdContext`:** Host-provided React Context (`useAppContext()`) replaces module-scope `appState.ts` as the recommended way for plugin components to access per-app APIs
- **Error isolation:** `PluginErrorBoundary` wraps every plugin resource; plugins can supply custom fallback components
- **`useContextMenuApi()` deleted:** The hook and `cyweb/ContextMenuApi` expose are removed (never publicly released); context menu access moves to `AppContext.apis.contextMenu` (factory-bound) or `window.CyWebApi.contextMenu` (anonymous singleton)
- **Two-type model:** `CyWebApiType` (window-safe, no `resource`) and `AppContextApis` (extends `CyWebApiType`, `resource` required) — distinct by design

**New public API surface (available via `AppContext.apis.resource` in `mount()`):**

```typescript
interface ResourceApi {
  getSupportedSlots(): ResourceSlot[]
  registerPanel(options): ApiResult<{ resourceId: string }>
  unregisterPanel(panelId: string): ApiResult
  registerMenuItem(options): ApiResult<{ resourceId: string }>
  unregisterMenuItem(menuItemId: string): ApiResult
  unregisterAll(): ApiResult
  registerAll(entries): ApiResult<{ registered; errors }>
  getRegisteredResources(): RegisteredResourceInfo[]
  getResourceVisibility(id: string): ResourceVisibilityResult
}
```

`resource` is NOT on `window.CyWebApi` (requires React components). Plugin components access it via `useAppContext().apis.resource`.

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

### Phase 1: App API Implementation and Example App Validation

> Full app API design and Module Federation integration details are in [app-api-specification.md](specifications/app-api-specification.md).
> Detailed type infrastructure design is in [phase0-shared-types-design.md](specifications/phase0-shared-types-design.md).
> Event bus detailed design is in [event-bus-specification.md](specifications/event-bus-specification.md).

Design the app API surface first, then implement incrementally. Each sub-phase delivers working code with tests. **Example apps** in [cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples) are updated as validation targets alongside each API sub-phase. The phase is complete when multiple toy examples run end-to-end against the app API.

The app API is the **only new public API** — internal hooks and stores are created or modified as needed to support the app API, but are not independently exposed.

#### Step 0: Foundation Types and Core Layer Structure

1. Define shared types (`ApiResult<T>`, `ApiErrorCode`) and public type re-exports
2. Create `src/app-api/types/` directory structure with barrel exports
3. Create `src/app-api/core/` directory with `index.ts` that assembles the `CyWebApi` object
4. Assign `window.CyWebApi = CyWebApi` in `src/init.tsx` after store initialization
5. Add `cyweb/ApiTypes` entry to `webpack.config.js`
6. Unit tests for `ApiResult` helpers (`ok`, `fail`, type guards)
7. Behavioral documentation (`src/app-api/api_docs/Api.md`)

> Design: [phase0-shared-types-design.md](specifications/phase0-shared-types-design.md) · ADRs: [0001](../../../docs/adr/0001-api-result-discriminated-union.md), [0002](../../../docs/adr/0002-public-type-reexport-strategy.md), [0003](../../../docs/adr/0003-framework-agnostic-core-layer.md)

#### Step 1: App API Hook Implementation (5 sub-phases)

Each sub-phase produces: app API hook source → unit tests → webpack entry → behavioral docs.

Each sub-phase produces two files per domain: `src/app-api/core/<domain>Api.ts` (framework-agnostic
core functions) and `src/app-api/use<Domain>Api.ts` (thin React hook wrapper). Core function tests
use plain Jest; hook wrapper tests use `renderHook`.

**1a: Element API** (`core/elementApi.ts` + `useElementApi.ts`)

- Node/edge CRUD: `createNode`, `createEdge`, `deleteNodes`, `deleteEdges`, `getNode`, `getEdge`, `moveEdge`
- Coordinates stores via `.getState()` (mirrors logic of `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges`)
- **Enhancement (1a+):** Add optional `bypass` field to `CreateNodeOptions` and `CreateEdgeOptions` so callers can set visual property bypasses atomically at creation time (single API call instead of create + separate `setBypass`). The `bypass` field is `Partial<Record<VisualPropertyName, VisualPropertyValueType>>`. Implementation: call `visualStyleApi.setBypass` immediately after the element is created if `options.bypass` is non-empty.

**1b: Network API** (`core/networkApi.ts` + `useNetworkApi.ts`)

- Network lifecycle: `createNetworkFromEdgeList`, `createNetworkFromCx2`, `deleteNetwork`
- Includes CX2 validation fix (P0 item 1.6)
- Coordinates stores via `.getState()` (mirrors logic of `useCreateNetworkWithView`, `useCreateNetworkFromCx2`)
- **Example validation**: Migrate `network-workflows/CreateNetworkMenu` and `CreateNetworkFromCx2Menu` from raw stores/hooks to `useNetworkApi`

**1c: Selection + Viewport API** (`core/selectionApi.ts`, `core/viewportApi.ts` + hook wrappers)

- Selection: `exclusiveSelect`, `additiveSelect`, `toggleSelected`, `getSelection`
- Viewport: `fit`, `getNodePositions`, `updateNodePositions`
- **Example validation**: Add selection/viewport demo to `hello-world/HelloPanel`

**1d: Table + Visual Style API** (`core/tableApi.ts`, `core/visualStyleApi.ts` + hook wrappers)

- Table: `getValue`, `getRow`, `createColumn`, `setValue`, `setValues`
- Visual style: `setDefault`, `setBypass`, `createDiscreteMapping`, `createPassthroughMapping`
- **Example validation**: Update `simple-panel` to read/display table data via app API

**1e: Layout + Export API** (`core/layoutApi.ts`, `core/exportApi.ts` + hook wrappers)

- Layout: `applyLayout`, `getAvailableLayouts`
- Export: `exportToCx2`
- After 1e: Update `src/app-api/core/index.ts` to assemble all 8 domain objects into `CyWebApi`
- **Example validation**: Create `network-generator` toy example (create → layout → fit → export)

**1f: Workspace API** (`core/workspaceApi.ts` + `useWorkspaceApi.ts`)

- Read: `getWorkspaceInfo`, `getNetworkIds`, `getNetworkList`, `getNetworkSummary`, `getCurrentNetworkId`
- Write: `switchCurrentNetwork`, `setWorkspaceName`
- Coordinates `WorkspaceStore` + `NetworkSummaryStore` directly via `.getState()`
- `switchCurrentNetwork` fires `network:switched` via the existing `initEventBus` subscription (no additional wiring needed)
- Add `workspace: workspaceApi` to `CyWebApi` in `src/app-api/core/index.ts`
- Export `WorkspaceInfo`, `WorkspaceNetworkInfo`, `WorkspaceApi` types via `src/app-api/types/index.ts`
- **Example validation**: Update `hello-world/HelloPanel` to display workspace name and network list via `useWorkspaceApi`

**1g: App Lifecycle** (host-side `useAppManager.ts` wiring)

- Wire `CyAppWithLifecycle.mount(context)` and `unmount()` into `src/data/hooks/stores/useAppManager.ts`
- `AppContext.apis` is typed as `CyWebApiType` and set to `CyWebApi` directly (same object as `window.CyWebApi`)
- `mount({ appId, apis: CyWebApi })` is called after `registerApp`, if the app implements `mount`
- `unmount()` is called on `beforeunload` and when app status transitions to `AppStatus.Error`
- Backward-compatible: existing apps without `mount`/`unmount` continue to work unchanged
- **Example validation**: Add `mount(context)` to a toy app that calls `context.apis.workspace.getNetworkList()` on activation

> **Phase 2 note:** In Phase 2 (App Resource Registration), `AppContext.apis` changes from
> `CyWebApiType` to `AppContextApis` — a per-app object that extends `CyWebApiType` and adds
> `resource` (required) and a per-app `contextMenu` factory. The host constructs this per-app
> object in `useAppManager.ts` before calling `mountApp`. See
> [app-resource-registration-specification.md § 6.2.5–6.2.6](specifications/app-resource-registration-specification.md).

**1h: Context Menu API** (`core/contextMenuApi.ts` + `useContextMenuApi.ts`)

- Exposes a stable API for external apps to register and remove custom context menu items on nodes, edges, and the canvas background.
- `addContextMenuItem(config: ContextMenuItemConfig): ApiResult<{ itemId: string }>` — registers an item; returns a unique `itemId` for later removal
- `removeContextMenuItem(itemId: string): ApiResult` — removes a previously registered item by its `itemId`
- Context menu items are defined by `ContextMenuItemConfig`:
  ```typescript
  interface ContextMenuItemConfig {
    label: string
    handler: (target: ContextMenuTarget) => void
    /** Which context menus to appear in. @default ['node', 'edge'] */
    targetTypes?: Array<'node' | 'edge' | 'canvas'>
    icon?: string // optional URL or data URI
  }
  interface ContextMenuTarget {
    type: 'node' | 'edge' | 'canvas'
    id?: IdType // present for node/edge; absent for canvas
    networkId: IdType
  }
  ```
- **Host-side requirement:** A `ContextMenuItemStore` (Zustand) must be created to hold the registered item registry. The existing host context menu components (in `src/features/`) must be updated to read from this store and render app-registered items alongside built-in items.
- `addContextMenuItem`: validates `label` is non-empty, generates a UUID `itemId`, stores the entry in `ContextMenuItemStore`, returns `ok({ itemId })`.
- `removeContextMenuItem`: looks up the item by `itemId`, removes from store, returns `ItemNotFound` if the `itemId` is unknown.
- Add `contextMenu: contextMenuApi` to `CyWebApi` in `src/app-api/core/index.ts`.
- Add `cyweb/ContextMenuApi` entry to `webpack.config.js`.
- **New error code:** `ContextMenuItemNotFound = 'CONTEXT_MENU_ITEM_NOT_FOUND'` added to `ApiErrorCode`.
- **Example validation**: Add a demo to `hello-world` that registers an "Expand Pathway" item on node context menus via `mount(context)` and removes it in `unmount()`.

> **Phase 2 note:** `useContextMenuApi.ts` and the `cyweb/ContextMenuApi` Module Federation expose
> are **deleted** in Phase 2 (App Resource Registration). The context menu API is refactored into a
> per-app factory (`createContextMenuApi(appId)`) accessible via `AppContext.apis.contextMenu` in
> `mount()`, with an anonymous singleton retained for `window.CyWebApi.contextMenu`. Because the
> hook has not been publicly released, no deprecation period is needed. See
> [app-resource-registration-specification.md § 6.6](specifications/app-resource-registration-specification.md).

#### Step 2: Event Bus

Implement the typed event bus alongside or immediately after all domain APIs are complete. The
event bus is tightly coupled to `src/init.tsx` and the core layer, making Phase 1 the right time
to ship it — external apps that use the app API will immediately benefit from reactive event
subscriptions without polling.

**Deliverables:**

1. `src/app-api/event-bus/CyWebEvents.ts` — `CyWebEvents` interface (all 8 event types) +
   `dispatchCyWebEvent<K>` helper (calls `window.dispatchEvent(new CustomEvent(...))`)
2. `src/app-api/event-bus/initEventBus.ts` — Sets up one Zustand `subscribeWithSelector`
   subscription per domain; internal file, **not** exposed via Module Federation
3. `src/app-api/useCyWebEvent.ts` — React hook wrapper: `useEffect` + `addEventListener` +
   cleanup; exposed as `cyweb/EventBus`
4. `src/features/AppShell.tsx` — Call `initEventBus()` after store hydration from IndexedDB;
   dispatch `cywebapi:ready` immediately after (not in `src/init.tsx` — stores must hydrate first)
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

1. Add all 10 app API entries + `cyweb/EventBus` to `webpack.config.js`
   (`ModuleFederationPlugin.exposes`)
2. Mark existing 12 store exports and 2 task hooks `@deprecated` in JSDoc
3. Verify backward compatibility — existing examples still function with deprecated imports

#### Step 4: Example Repository Overhaul

Work in [cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples) on an `app-api` branch:

1. **Update `hello-world`** — Keep as the minimal panel-only example and migrate its panel to app API
   - `HelloPanel` → Use `useSelectionApi`, `useViewportApi` for interactive controls
2. **Update `network-workflows`** — Migrate workflow examples to app API
   - `CreateNetworkMenu` → `useNetworkApi().createNetworkFromEdgeList` (replace `useCreateNetworkWithView` + `useWorkspaceStore`)
   - `CreateNetworkFromCx2Menu` → `useNetworkApi().createNetworkFromCx2`
   - `JupyterConnectorPanel` → `useNetworkApi().createNetworkFromCx2`
3. **Update `simple-menu`** — Migrate menu actions to app API
4. **Update `simple-panel`** — Migrate to `useTableApi`, `useSelectionApi`
5. **Create `network-generator` example** — New toy app demonstrating end-to-end workflow:
   - Create network from edge list → apply layout → set visual styles → fit viewport
   - Demonstrates: `useNetworkApi` + `useLayoutApi` + `useVisualStyleApi` + `useViewportApi`
6. **Update `project-template`** — Scaffold uses app API imports, updated `remotes.d.ts` type declarations
7. **Update `patterns/` documentation** — Rewrite patterns to use app API
8. **Update README.md** — Document app API usage, deprecation notice for raw stores

#### Step 5: Bug Fixes

Fix existing bugs identified in the audit (Section 7). Addressed opportunistically as related app API hooks are implemented.

#### Phase 1 Exit Criteria

- [ ] All 9 `core/<domain>Api.ts` files implemented with plain Jest unit tests (no `renderHook`), including `workspaceApi.ts`
- [ ] All 9 `use<Domain>Api.ts` hook wrappers implemented (each ~1–5 lines), including `useWorkspaceApi.ts`
- [ ] `window.CyWebApi` assigned in `src/init.tsx` and accessible after app load
- [ ] `src/app-api/core/` contains zero React imports (verified by linting or code review)
- [ ] `WorkspaceApi` implemented: `getWorkspaceInfo`, `getNetworkIds`, `getNetworkList`, `getNetworkSummary`, `getCurrentNetworkId`, `switchCurrentNetwork`, `setWorkspaceName`
- [ ] `WorkspaceInfo` and `WorkspaceNetworkInfo` types exported via `cyweb/ApiTypes`
- [ ] `window.CyWebApi.workspace` accessible after app load
- [ ] `ApiResult<T>` and type re-exports verified via `cyweb/ApiTypes`
- [ ] `src/app-api/event-bus/initEventBus.ts` implemented; all 8 event types dispatch correctly
- [ ] `useCyWebEvent` hook exported via `cyweb/EventBus`; listener cleanup verified on unmount
- [ ] `cywebapi:ready` dispatched on `window` after `window.CyWebApi` is assigned
- [ ] `hello-world/HelloPanel` `SelectionCounter` demo works end-to-end via `useCyWebEvent`
- [ ] `hello-world` runs end-to-end using only app API (no raw store imports)
- [ ] `network-generator` toy example creates, lays out, styles, and exports a network
- [ ] Legacy store-based examples still function (backward compatibility)
- [ ] `project-template` updated for new developers to use app API
- [ ] `patterns/` documentation reflects app API usage
- [ ] `CyAppWithLifecycle.mount(context)` called by host when app is activated; `AppContext.apis === window.CyWebApi`
- [ ] `CyAppWithLifecycle.unmount()` called by host on page unload and app deactivation
- [ ] Existing apps without lifecycle methods continue to work (backward compatible)
- [ ] `createNode` accepts optional `bypass` field; visual property bypasses are applied atomically at creation
- [ ] `createEdge` accepts optional `bypass` field; visual property bypasses are applied atomically at creation
- [ ] `ContextMenuApi` implemented: `addContextMenuItem`, `removeContextMenuItem`
- [ ] `ContextMenuItemStore` implemented; host context menu components render app-registered items
- [ ] `window.CyWebApi.contextMenu` accessible after app load; `cyweb/ContextMenuApi` webpack entry added _(note: hook and expose are deleted in Phase 2; see §1.8)_
- [ ] Context menu items registered in `mount()` are removed in `unmount()` demo works end-to-end

### Phase 2: App Resource Runtime Registration

> Full design: [app-resource-registration-specification.md](specifications/app-resource-registration-specification.md).
> Checklist: [implementation-checklist-phase2.md](checklists/implementation-checklist-phase2.md).
> Minimal app examples: [app-resource-registration-minimal-app.md](examples/app-resource-registration-minimal-app.md).

Replace the manifest-only `CyApp.components` model with a slot-based runtime registry for panels
and app menu items. Unify the context menu API under the same per-app factory pattern. This phase
delivers the extensibility infrastructure needed for third-party apps to register app resources
without relying on the legacy manifest.

**Dependency:** Requires Phase 1 complete (all domain APIs, app lifecycle, context menu store).

#### Step 2.0: Foundation — Types, Models, and Store

- `AppResourceTypes.ts` — `ResourceSlot`, `PanelHostProps`, `MenuItemHostProps`, registration option
  types, `ResourceApi` interface, `ResourceDeclaration`
- `RegisteredAppResource.ts` — internal model (`component: unknown` — no React in model layer)
- `AppResourceStoreModel.ts` + `AppResourceStore.ts` — Zustand store with upsert/remove/query actions
- `ResourceNotFound` error code added to `ApiErrorCode`

#### Step 2.1: App Cleanup Registry

- `AppCleanupRegistry.ts` — `registerAppCleanup(fn)` / `cleanupAllForApp(appId)` pattern so that
  adding a new registrable resource type requires no changes to `appLifecycle.ts`
- `AppResourceStore` and `ContextMenuItemStore` register their cleanup at module load time
- `ContextMenuItemStore` gains `removeAllByAppId(appId)` (skips anonymous items)
- `appLifecycle.ts` refactored to delegate to `cleanupAllForApp` instead of hardcoded per-store calls

#### Step 2.2: Core App Resource API

- `core/resourceApi.ts` — per-app factory (`createResourceApi(appId)`)
- Methods: `getSupportedSlots`, `registerPanel` (upsert), `unregisterPanel`, `registerMenuItem`
  (upsert), `unregisterMenuItem`, `unregisterAll`, `registerAll` (batch), `getRegisteredResources`
  (introspection), `getResourceVisibility` (debug)
- Component runtime validation (`typeof component === 'function'`) at registration time

#### Step 2.3: Context Menu Factory Refactor

- **Delete** `useContextMenuApi.ts`, its tests, barrel export, `cyweb/ContextMenuApi` expose, and
  `mf-declarations.d.ts` module declaration (never publicly released — no deprecation period)
- Refactor `contextMenuApi.ts` into `createContextMenuApi(appId)` factory + anonymous singleton
- `appId` stored as optional field on `RegisteredContextMenuItem`; `removeAllByAppId` skips anonymous
- Update all documentation: `Api.md`, `CLAUDE.md`, `app-api-specification.md`, `README.md`,
  Phase 1 checklist

#### Step 2.4: AppIdContext and Type Model

- `AppIdContext.tsx` — `AppIdProvider` + `useAppContext()` hook (replaces module-scope `appState.ts`)
- `AppContextApis` type (extends `CyWebApiType`, adds required `resource`) — distinct from
  `CyWebApiType` which remains the window-safe shape
- `cyweb/AppIdContext` expose in webpack.config.js
- `packages/api-types` updated: `CyWebApiType` for `window.CyWebApi`, `AppContextApis` for `mount()`

#### Step 2.5: App Lifecycle Integration

- `CyApp.components` made optional (with `@deprecated`); `resources?: ResourceDeclaration[]` added to
  `CyAppWithLifecycle`
- `useAppManager.ts` constructs per-app `{ ...CyWebApi, resource, contextMenu }` and processes
  declarative `resources` before calling `mountApp`
- `appLifecycle.ts` updated: `mountApp` with duration warning (>100ms), `unmountApp` calls
  `cleanupAllForApp` before `unmount()`

#### Step 2.6: PluginErrorBoundary

- `PluginErrorBoundary.tsx` using `react-error-boundary` — per-resource isolation with optional
  custom fallback component; logs via `logApp.error`

#### Step 2.7–2.8: Host Renderer Updates

- `SidePanel.tsx` — resource-identity-based tab selection (replaces fragile numeric index)
- `TabContents.tsx` — merges manifest + runtime resources; applies `requires.network` visibility,
  ordering, `PluginErrorBoundary`, `AppIdProvider` wrapping
- `AppMenu/index.tsx` — same merge + `closeOnAction` auto-close implementation

#### Step 2.9: Example App Migration

- Migrate `hello-world` and `project-template` from `useContextMenuApi()` to `useAppContext()` /
  declarative `resources`
- Verify no remaining `cyweb/ContextMenuApi` imports

#### Phase 2 Exit Criteria

- [ ] Runtime-registered panels and menu items render without `CyApp.components`
- [ ] Declarative `resources` field works without `mount()`
- [ ] `AppContext.apis` typed as `AppContextApis` (not `CyWebApiType`); `resource` is required
- [ ] `window.CyWebApi.resource` is `undefined`; TypeScript rejects `window.CyWebApi.resource`
- [ ] `cyweb/ContextMenuApi` expose deleted; `cyweb/AppIdContext` expose added
- [ ] `cleanupAllForApp(appId)` cleans all stores; no hardcoded cleanup in `appLifecycle.ts`
- [ ] `PluginErrorBoundary` isolates plugin failures per resource
- [ ] `requires.network` hides panels when no network is loaded
- [ ] Resource-identity tab selection preserves selection across panel add/remove/hide
- [ ] `closeOnAction: true` auto-closes Apps dropdown after action
- [ ] Upsert semantics: re-registering a resource updates title/component without flicker
- [ ] Existing `CyApp.components` apps continue to work (backward compatible)
- [ ] All example apps migrated and building

### Phase 3: Sample Code and Developer Documentation

> Implementation checklist: [implementation-checklist-phase3.md](checklists/implementation-checklist-phase3.md).

Focus: make it easy for third-party developers to build and publish Cytoscape Web apps.

**Shipped in earlier phases (1–4):**

1. ~~App Lifecycle contract (`AppContext`, `CyAppWithLifecycle`)~~ — **Phase 1 Step 1g.**
2. ~~Context Menu API~~ — **Phase 1 Step 1h; refactored to per-app factory in Phase 2.**
3. ~~CX2 Export API~~ — **Phase 1e** as `exportApi.exportToCx2`.
4. ~~UI integration points (panels, app menu items)~~ — **Phase 2** as `ResourceApi` with slot model.

**Phase 3 deliverables (5–9):**

5. **App Developer Guide** (Step 3.0) — zero-to-deploy walkthrough: project setup, `@cytoscape-web/api-types`, webpack MF config, `resources[]`, `mount()`/`unmount()`, context menu, event bus, deploy
6. **API Reference** (Step 3.1) — add `ResourceApi`, `AppIdContext`/`useAppContext()`, `AppContextApis` to `Api.md`; update error codes, App Lifecycle, and `window.CyWebApi` sections
7. **Enriched Examples** (Step 3.2) — expand `hello-world` to cover all API surfaces (ViewportApi, TableApi, ExportApi, ElementApi); migrate `network-workflows` to Phase 2 `resources[]` pattern
8. **Starter Template Overhaul** (Step 3.3) — fix id/name mismatch, add TODO markers, update README
9. **Package Documentation** (Step 3.4) — `@cytoscape-web/api-types` README fixes, CHANGELOG.md
10. **Cross-cutting Updates** (Step 3.5) — update examples CLAUDE.md, rewrite patterns/README.md with App API hooks, clean up stale references

### Pre-Beta: Graph Traversal API (Step 3.6)

Add read-only graph query methods to `ElementApi`, wrapping cytoscape.js core
methods via `getInternalNetworkDataStore()`. All methods follow the existing
2-layer pattern (core function + React hook) and return `ApiResult<T>`.

**New `ElementApi` methods (Group A — thin wrappers):**

| Method | cytoscape.js | Returns |
|--------|-------------|---------|
| `getNodeIds(networkId)` | `cy.nodes()` | `{ nodeIds: IdType[] }` |
| `getEdgeIds(networkId)` | `cy.edges()` | `{ edgeIds: IdType[] }` |
| `getConnectedEdges(networkId, nodeId)` | `node.connectedEdges()` | `{ edges: EdgeData[] }` |
| `getConnectedNodes(networkId, nodeId)` | `node.neighborhood().nodes()` | `{ nodeIds: IdType[] }` |
| `getOutgoers(networkId, nodeId)` | `node.outgoers()` | `{ nodeIds: IdType[], edgeIds: IdType[] }` |
| `getIncomers(networkId, nodeId)` | `node.incomers()` | `{ nodeIds: IdType[], edgeIds: IdType[] }` |
| `getSuccessors(networkId, nodeId)` | `node.successors()` | `{ nodeIds: IdType[] }` |
| `getPredecessors(networkId, nodeId)` | `node.predecessors()` | `{ nodeIds: IdType[] }` |
| `getRoots(networkId)` | `cy.nodes().roots()` | `{ nodeIds: IdType[] }` |
| `getLeaves(networkId)` | `cy.nodes().leaves()` | `{ nodeIds: IdType[] }` |

**Motivation:** External developers building graph-manipulation apps (e.g.,
pathway expand/collapse) need adjacency queries. The internal cytoscape.js
instance already supports these operations; the App API simply exposes them.

> Implementation checklist: [implementation-checklist-phase3.md § Step 3.6](checklists/implementation-checklist-phase3.md)

#### Step 3.7: TSV Table Import/Export API (Pre-Beta)

Add TSV-based table I/O to enable efficient data exchange between Cytoscape
Web and external analysis tools (Python/pandas, R, CLI agents).

**Motivation:** The existing `exportToCx2()` produces complete but verbose JSON
(~500KB for a 1000-node network). For iterative analysis workflows — export
attributes → run analysis in Python/R → write results back — a compact
tab-delimited format reduces payload size by ~10x and maps 1:1 to
`pandas.DataFrame` / R `data.frame`.

**New methods on `TableApi`:**

```typescript
// Export: table → TSV string
getTable(
  networkId: IdType,
  tableType: 'node' | 'edge',
  options?: {
    columns?: string[]         // subset of columns (omit = all)
    includeTypeHeader?: boolean // "name:string\tdegree:integer" header
  },
): ApiResult<{
  columns: Array<{ name: string; type: ValueTypeName }>
  rows: Array<Record<string, ValueType>>
}>

exportTableToTsv(
  networkId: IdType,
  tableType: 'node' | 'edge',
  options?: {
    columns?: string[]
    includeTypeHeader?: boolean  // default: false (plain TSV)
  },
): ApiResult<{ tsvText: string }>

// Import: TSV string → table
importTableFromTsv(
  networkId: IdType,
  tableType: 'node' | 'edge',
  tsvText: string,
  options?: {
    keyColumn?: string  // column to match rows (default: 'id')
  },
): ApiResult<{ rowCount: number; newColumns: string[] }>
```

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| TSV not CSV | Tab separators avoid quoting issues with commas in biological names. Matches Cytoscape Desktop convention |
| `getTable()` as structured read | Returns typed columns + rows for programmatic use; `exportTableToTsv()` is a string convenience wrapper |
| `includeTypeHeader` opt-in | Default plain TSV maximizes compatibility with pandas/R. Typed header (`name:string`) enables lossless round-trip |
| Import matches by key column | Default `id` column; overridable to `name` for human-authored data |
| On `TableApi` not `ExportApi` | Table I/O is naturally grouped with other table operations. `ExportApi` remains for whole-network formats (CX2) |
| Edge table includes source/target | When exporting edge table, `source` and `target` columns are always included. This implicitly captures topology |

**Existing code to leverage:**

| Existing code | Location | Reuse |
|---|---|---|
| `parseSif()`, `validateSif()` | `src/utils/sifUtils.ts` | Pattern reference for text-to-model parsing |
| `tableApi.getRow()`, `tableApi.editRows()` | `src/app-api/core/tableApi.ts` | Extend with `getTable()` / `importTableFromTsv()` |
| `inferColumnType()` | `src/data/hooks/stores/TableStore.ts` | Auto-detect types on TSV import when no type header |

**Round-trip workflow example:**

```
Cytoscape Web                  Python/R
     │                              │
     │ exportTableToTsv('node')     │
     │ ──────────────────────────►  │
     │       (compact TSV)          │  df = pd.read_csv(tsv, sep='\t')
     │                              │  df['cluster'] = louvain(G)
     │ importTableFromTsv('node')   │  df.to_csv(result, sep='\t')
     │ ◄──────────────────────────  │
     │       (analysis results)     │
     │                              │
     │ setMapping('cluster'→color)  │
     │  (visualize results)         │
```

> Implementation checklist: [implementation-checklist-phase3.md § Step 3.7](checklists/implementation-checklist-phase3.md)

### Beta Release (between Step 3.7 and Phase 4)

Before proceeding to Phase 4, publish the first beta release of the App API.

**Pre-release tasks:**

- [ ] Merge `new-app-api` branch into `development`
- [ ] Update all GitHub URL links in `cytoscape-web-app-examples/README.md` and `guides/architecture-overview.md`: change branch from `new-app-api` to `development`
- [ ] Bump `@cytoscape-web/api-types` to `0.1.0-beta.0` (drop alpha tag)
- [ ] Update `apiVersion` in all example apps if needed
- [ ] Tag release in both repositories
- [ ] Publish beta announcement with link to developer documentation

### Phase 4: Platform Extensibility

Items deferred from earlier phases — each requires its own design document.

10. Dynamic app registration mechanism (URL-based app loading, manifest validation)
11. Chrome Extension bridge reference implementation (MCP Bridge Server + Adapter content script using `window.CyWebApi`)
12. Expand UI slots: `'left-panel'`, `'bottom-panel'`, `'tools-menu'`, `'status-bar'`, `'modal-launcher'`
13. Non-component resource registration (keyboard shortcuts, commands) via `resources` declarative field
14. Inter-app communication protocol
15. Security sandbox evaluation

---

## 3. Timeline

### Phase 1: App API Implementation and Example Validation

- **Goal**: Implement app API and validate with working toy examples end-to-end

| Milestone                     | Deliverables                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 0: Foundation types      | `ApiResult.ts`, `ElementTypes.ts`, barrel exports, unit tests, `cyweb/ApiTypes` webpack entry                                                  |
| Step 1a: Element API          | `useElementApi.ts`, unit tests, `cyweb/ElementApi` webpack entry                                                                               |
| Step 1b: Network API          | `useNetworkApi.ts`, CX2 validation fix, unit tests, **first example migration** (`network-workflows` CreateNetworkMenu)                        |
| Step 1c: Selection + Viewport | `useSelectionApi.ts`, `useViewportApi.ts`, unit tests, HelloPanel demo update                                                                  |
| Step 1d: Table + Visual Style | `useTableApi.ts`, `useVisualStyleApi.ts`, unit tests, `simple-panel` migration                                                                 |
| Step 1e: Layout + Export      | `useLayoutApi.ts`, `useExportApi.ts`, unit tests, `network-generator` example                                                                  |
| Step 1f: Workspace API        | `useWorkspaceApi.ts`, unit tests, `cyweb/WorkspaceApi` webpack entry, `WorkspaceInfo`/`WorkspaceNetworkInfo` types, `hello-world` panel update |
| Step 1g: App Lifecycle        | `useAppManager.ts` lifecycle wiring, `AppContext.apis` typed as `CyWebApiType`, `mount`/`unmount` tests                                        |
| Step 1a+: Element bypass      | `bypass` field on `CreateNodeOptions` + `CreateEdgeOptions`; atomic create+bypass in `elementApi.ts`                                           |
| Step 1h: Context Menu API     | `ContextMenuItemStore`, `contextMenuApi.ts`, `useContextMenuApi.ts`, host UI wiring, unit tests                                                |
| Step 2: Event Bus             | `initEventBus.ts`, `useCyWebEvent.ts`, `cyweb/EventBus` entry, unit + hook tests, `cywebapi:ready` dispatch, `SelectionCounter` demo           |
| Step 3: Integration           | Webpack config finalization, `@deprecated` markers, backward compatibility verification                                                        |
| Step 4: Examples & Docs       | Example repo overhaul complete, `project-template` update, end-to-end validation, bug fixes                                                    |

**Key dependencies:**

- Steps 1a–1e are sequential (each builds on shared types from Step 0)
- Example migrations in Step 3 begin incrementally after Step 1b (Network API is the minimum for `hello-world`)
- Parallel work: unit tests alongside implementation; example migration starts as APIs become available

**Milestones (checkpoints):**

| Checkpoint                | Verification                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------- |
| First toy example working | `network-workflows/CreateNetworkMenu` creates a network via `useNetworkApi`            |
| Core APIs complete        | All 8 app API hooks pass unit tests                                                    |
| Event bus live            | `SelectionCounter` in `hello-world/HelloPanel` reacts to selection via `useCyWebEvent` |
| E2E example suite         | `network-generator` runs full workflow (create → layout → style → export)              |
| Phase 1 complete          | All exit criteria met, `app-api` branch ready for merge in examples repo               |

### Phase 2: App Resource Runtime Registration

- **Goal**: Replace manifest-only extension model with runtime registration; unify context menu under per-app factory pattern

| Milestone                       | Deliverables                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Step 2.0: Foundation            | `AppResourceTypes.ts`, `RegisteredAppResource.ts`, `AppResourceStoreModel.ts`, `AppResourceStore.ts`, store tests                   |
| Step 2.1: Cleanup Registry      | `AppCleanupRegistry.ts`, `removeAllByAppId` on `ContextMenuItemStore`, `appLifecycle.ts` refactor                                   |
| Step 2.2: Core API              | `core/resourceApi.ts` (factory, batch, introspection), unit tests                                                                   |
| Step 2.3: Context Menu Factory  | Delete `useContextMenuApi` + expose; refactor to `createContextMenuApi(appId)` factory + anonymous singleton; documentation updates |
| Step 2.4: AppIdContext & Types  | `AppIdContext.tsx`, `AppContextApis` type, `cyweb/AppIdContext` expose, `api-types` package update                                  |
| Step 2.5: Lifecycle Integration | `CyApp.components` optional, `resources` field, `useAppManager.ts` per-app API construction, `appLifecycle.ts` mount/unmount        |
| Step 2.6: Error Boundary        | `PluginErrorBoundary.tsx` (per-resource isolation, custom fallback)                                                                 |
| Step 2.7–2.8: Renderers         | `SidePanel.tsx` identity-based tabs, `TabContents.tsx` + `AppMenu/index.tsx` merge manifest + runtime resources, `closeOnAction`    |
| Step 2.9: Example Migration     | `hello-world` + `project-template` migrated to `useAppContext()` / declarative `resources`                                          |

**Key dependencies:**

- Steps 2.0–2.2 are sequential (store → cleanup → API)
- Steps 2.3 (context menu refactor) and 2.4 (AppIdContext) can proceed in parallel after 2.2
- Step 2.5 depends on 2.2 + 2.3 + 2.4
- Steps 2.7–2.8 depend on 2.5 + 2.6
- Step 2.9 depends on all prior steps

**Milestones (checkpoints):**

| Checkpoint           | Verification                                                                            |
| -------------------- | --------------------------------------------------------------------------------------- |
| Store + API working  | `AppResourceStore` tests pass; `createResourceApi` tests pass                           |
| Context menu unified | `useContextMenuApi` deleted; factory + anonymous singleton tests pass                   |
| Lifecycle integrated | `mountApp` constructs per-app APIs; declarative `resources` registered before `mount()` |
| Renderers updated    | Runtime-registered panel visible in side panel; menu item visible in Apps dropdown      |
| Phase 2 complete     | All exit criteria met; example apps migrated                                            |

### Phase 3: Sample Code and Developer Documentation

- **Goal**: Make it easy for third-party developers to build, test, and publish Cytoscape Web apps
- **Checklist**: [implementation-checklist-phase3.md](checklists/implementation-checklist-phase3.md)

| Milestone                            | Deliverables                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Step 3.0: App Developer Guide        | Zero-to-deploy walkthrough + Migration Guide (Phase 1→2); update examples root README                                           |
| Step 3.1: API Reference              | Add `ResourceApi`, `AppIdContext`/`useAppContext()`, `AppContextApis` to Api.md; update error codes, lifecycle, CyWebApi sections |
| Step 3.2: Enriched Examples           | Expand `hello-world` with ViewportApi, TableApi, ExportApi, ElementApi sections; migrate `network-workflows` to `resources[]`    |
| Step 3.3: Starter Template Overhaul   | Fix id/name mismatch, add TODO markers, update README                                                                            |
| Step 3.4: Package Documentation       | `@cytoscape-web/api-types` README fixes, CHANGELOG.md                                                                            |
| Step 3.5: Cross-cutting Updates       | Update examples CLAUDE.md, rewrite patterns/README.md, clean up stale references                                                 |
| Step 3.6: Graph Traversal API         | 10 read-only `ElementApi` methods wrapping cytoscape.js core; `network-statistics` non-React example                             |
| Step 3.7: TSV Table I/O API           | `getTable()`, `exportTableToTsv()`, `importTableFromTsv()` on `TableApi`; enables pandas/R round-trip workflows                 |

**Milestones (checkpoints):**

| Checkpoint                    | Verification                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Guide published               | A new developer can create a working app from scratch following only the guide                 |
| Reference complete            | Every public API function has description, parameters, return type, and example                |
| Examples comprehensive        | `hello-world` exercises every API domain (all 10 + EventBus + ResourceApi)                   |
| Template works out-of-the-box | `git clone` → `npm install` → `npm run dev` produces a working panel + menu item in < 5 min  |
| Graph traversal working       | `getConnectedNodes`, `getRoots`, `getLeaves` etc. pass unit tests; `network-statistics` runs |
| TSV I/O working               | `exportTableToTsv` → edit → `importTableFromTsv` round-trip preserves data                   |
| Phase 3 complete              | All docs reviewed; example apps build against published `@cytoscape-web/api-types`            |

### Phase 4: Platform Extensibility (TBD)

Items deferred from earlier phases — each requires its own design document before implementation.

- Dynamic app registration (URL-based loading, manifest validation)
- Chrome Extension bridge (MCP Bridge Server + Adapter content script)
- Expanded UI slots (`'left-panel'`, `'bottom-panel'`, `'tools-menu'`, `'status-bar'`, `'modal-launcher'`)
- Non-component resource registration (keyboard shortcuts, commands)
- Inter-app communication protocol
- Security sandbox evaluation
