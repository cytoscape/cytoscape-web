# Event Bus Specification

**Rev. 1 (2/21/2026): Keiichiro ONO and Claude Code w/ Sonnet 4.6**

Detailed design for the typed event bus. For priorities and roadmap context, see
[module-federation-design.md § 1.5 and Phase 1 Step 2](../module-federation-design.md). For the
facade API design that the event bus complements, see
[facade-api-specification.md](facade-api-specification.md).

---

## 1. Event Bus Design

### 1.1 Overview

External apps need to react to state changes inside Cytoscape Web without polling. The event bus
provides a typed, one-way notification channel: Cytoscape Web dispatches; external apps listen.

**Design principle: `window.dispatchEvent` + `CustomEvent`**

The event bus uses the browser's native `CustomEvent` API dispatched on `window`. A thin React
hook (`useCyWebEvent`) wraps `window.addEventListener` for React consumers. Vanilla JS consumers
call `window.addEventListener` directly.

This model provides three properties no pub/sub library can match:

1. **Zero-dependency universality** — Both React apps (Module Federation) and Vanilla JS consumers
   (browser extensions, LLM agent bridges, server-side runners) use the identical primitive.
   No bundler, no React, no shared singleton required.
2. **Module boundary transparency** — `CustomEvent` on `window` is visible across all script
   contexts on the page, including iframes and browser extension content scripts. A shared object
   passed through Module Federation would not reach these consumers.
3. **Browser DevTools observability** — Custom events appear in the Chrome DevTools Event
   Listeners panel, making event flow debuggable without additional instrumentation.

**Dispatch origins**

| Event category    | Dispatch origin                                                  |
| ----------------- | ---------------------------------------------------------------- |
| Network lifecycle | Zustand subscription in `initEventBus.ts` (WorkspaceStore)      |
| Selection         | Zustand subscription in `initEventBus.ts` (ViewModelStore)      |
| Layout            | Called directly from `core/layoutApi.ts` (start + completion)   |
| Style             | Zustand subscription in `initEventBus.ts` (VisualStyleStore)    |
| Data              | Zustand subscription in `initEventBus.ts` (TableStore)          |

Layout events are an exception to the subscription model: because `applyLayout` is an async
operation initiated through the facade API, `layout:started` and `layout:completed` are dispatched
directly from `core/layoutApi.ts` using the shared `dispatchCyWebEvent` helper. This avoids
building store state purely to notify the event bus.

### 1.2 Directory Structure

```
src/app-api/
├── event-bus/
│   ├── CyWebEvents.ts         # CyWebEvents interface + CyWebEventMap type
│   ├── dispatchCyWebEvent.ts  # Generic dispatchCyWebEvent<K> helper
│   └── initEventBus.ts        # Zustand subscriptions — internal, not exposed
├── useCyWebEvent.ts           # React hook wrapper — exposed as cyweb/EventBus
└── index.ts                   # (barrel — useCyWebEvent re-exported here)
```

`initEventBus.ts` is internal and never exposed via Module Federation. `useCyWebEvent.ts` is
exposed as `cyweb/EventBus`. `dispatchCyWebEvent` is also used by `core/layoutApi.ts` for the
layout lifecycle events.

### 1.3 CyWebEvents Interface

```typescript
// src/app-api/event-bus/CyWebEvents.ts

import type { IdType } from '../../models/IdType'

/**
 * Map of all typed events dispatched by Cytoscape Web.
 * Keys are the CustomEvent type strings; values are the event detail shapes.
 */
export interface CyWebEvents {
  /** Fired when a new network is added to the workspace. */
  'network:created': { networkId: IdType }

  /** Fired when a network is removed from the workspace. */
  'network:deleted': { networkId: IdType }

  /**
   * Fired when the active (current) network changes.
   * `previousId` is an empty string if no network was active before.
   */
  'network:switched': { networkId: IdType; previousId: IdType }

  /** Fired when the selection state of the current network's view changes. */
  'selection:changed': {
    networkId: IdType
    selectedNodes: IdType[]
    selectedEdges: IdType[]
  }

  /** Fired immediately before a layout algorithm begins executing. */
  'layout:started': { networkId: IdType; algorithm: string }

  /** Fired when a layout algorithm has finished and node positions are updated. */
  'layout:completed': { networkId: IdType; algorithm: string }

  /**
   * Fired when a visual style property changes on any network.
   * `property` is the `VisualPropertyName` string (e.g., `'NODE_BACKGROUND_COLOR'`).
   * If a mapping or default changes, `property` reflects the affected property name.
   */
  'style:changed': { networkId: IdType; property: string }

  /**
   * Fired when table data is written to a network's node or edge table.
   * `rowIds` is the set of node/edge IDs whose data changed in this write.
   */
  'data:changed': { networkId: IdType; tableType: 'node' | 'edge'; rowIds: IdType[] }
}

/**
 * WindowEventMap augmentation for TypeScript consumers.
 * Maps each CyWebEvents key to a typed CustomEvent so that
 * window.addEventListener overloads carry the correct detail type.
 */
export type CyWebEventMap = {
  [K in keyof CyWebEvents]: CustomEvent<CyWebEvents[K]>
}
```

### 1.4 Event Type Specifications

#### 1.4.1 `network:created`

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| **Trigger** | A new network is added to the workspace                        |
| **Source**  | `WorkspaceStore` — subscription on `networkIds` array          |
| **Detail**  | `{ networkId: IdType }`                                        |

**Implementation note:** The subscription compares the previous and current `networkIds` arrays.
Any ID present in the current array but absent in the previous array produces one
`network:created` event per ID. This correctly handles bulk imports (multiple networks added in a
single store mutation) by emitting one event per created network.

**Startup suppression:** During initial app load, `WorkspaceStore` hydrates from IndexedDB and
populates `networkIds` from an empty array. To avoid spurious `network:created` events for
previously-persisted networks, `initEventBus()` is called **after** store hydration is complete.
The hydration guard is already enforced by the initialization order in `src/init.tsx` (stores
hydrate before `initEventBus()` is called).

#### 1.4.2 `network:deleted`

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| **Trigger** | A network is removed from the workspace                        |
| **Source**  | `WorkspaceStore` — subscription on `networkIds` array          |
| **Detail**  | `{ networkId: IdType }`                                        |

**Implementation note:** Symmetric to `network:created`. Any ID present in the previous array but
absent in the current array produces one `network:deleted` event per ID.

#### 1.4.3 `network:switched`

| Property    | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Trigger** | The active (current) network changes                                |
| **Source**  | `WorkspaceStore` — subscription on `currentNetworkId`              |
| **Detail**  | `{ networkId: IdType; previousId: IdType }`                        |

**Guard:** The event is not dispatched if `networkId === previousId`. `previousId` is `''` (empty
string) when no network was active before (e.g., the workspace was empty and the first network was
created).

#### 1.4.4 `selection:changed`

| Property    | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Trigger** | The selection state of the current network's view changes           |
| **Source**  | `ViewModelStore` — subscription on selection for `currentNetworkId` |
| **Detail**  | `{ networkId: IdType; selectedNodes: IdType[]; selectedEdges: IdType[] }` |

**Implementation note:** The subscription watches `{ selectedNodes, selectedEdges }` for the
current network view and uses `shallowEqual` to compare array references. A new array reference
with the same contents does **not** fire the event. `currentNetworkId` is read from
`WorkspaceStore.getState()` at dispatch time to populate the detail.

**Re-subscription on network switch:** Because the subscription tracks the current network's view,
the subscription selector must be re-evaluated when `currentNetworkId` changes. The implementation
uses a single top-level subscription on the full `ViewModelStore` state, extracting the slice for
the current network at evaluation time, rather than creating nested subscriptions per network.

#### 1.4.5 `layout:started`

| Property    | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Trigger** | A layout algorithm begins executing                                 |
| **Source**  | Dispatched directly from `core/layoutApi.ts` (`applyLayout`)       |
| **Detail**  | `{ networkId: IdType; algorithm: string }`                         |

**Implementation note:** `layout:started` is dispatched synchronously at the start of `applyLayout`
before the layout engine is invoked. `algorithm` matches the layout name string (e.g.,
`'circular'`, `'force-directed'`). If `applyLayout` returns an error (e.g.,
`LayoutEngineNotFound`), neither `layout:started` nor `layout:completed` is dispatched.

#### 1.4.6 `layout:completed`

| Property    | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Trigger** | A layout algorithm has finished and node positions are committed    |
| **Source**  | Dispatched directly from `core/layoutApi.ts` after layout resolves |
| **Detail**  | `{ networkId: IdType; algorithm: string }`                         |

**Implementation note:** `layout:completed` is dispatched after `ViewModelStore` position updates
are committed. If the layout is cancelled or errors mid-execution, the event is not dispatched
(the cancelled/error path returns an `ApiFailure` without firing the event). `algorithm` is the
same string as the corresponding `layout:started` event.

#### 1.4.7 `style:changed`

| Property    | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Trigger** | A visual style property changes on any network                     |
| **Source**  | `VisualStyleStore` — subscription on the style for each network    |
| **Detail**  | `{ networkId: IdType; property: string }`                          |

**`property` value:** The `VisualPropertyName` string that changed (e.g.,
`'NODE_BACKGROUND_COLOR'`, `'EDGE_WIDTH'`). For batch updates that change multiple properties in a
single store mutation, the event bus emits one event per changed property.

**Throttling:** The event bus does not throttle or debounce `style:changed` by default. If a
consumer drives an expensive re-render on each event (e.g., a full style inspector rebuild), it
should apply its own debounce. See [§ 2.3](#23-performance-considerations) for guidance.

#### 1.4.8 `data:changed`

| Property    | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Trigger** | Attribute data is written to a node or edge table                  |
| **Source**  | `TableStore` — subscription on table data per network              |
| **Detail**  | `{ networkId: IdType; tableType: 'node' \| 'edge'; rowIds: IdType[] }` |

**`rowIds` semantics:** The set of IDs whose data changed in this write. For bulk operations (e.g.,
`setValues` updating 500 nodes), all affected IDs are included in a single `data:changed` event.
Consumers may receive an empty `rowIds` array if a column schema change occurs without row data
changing (e.g., `createColumn`); this is intentional.

### 1.5 `dispatchCyWebEvent` Helper

```typescript
// src/app-api/event-bus/dispatchCyWebEvent.ts

import type { CyWebEvents } from './CyWebEvents'

/**
 * Type-safe helper for dispatching CyWeb events on window.
 * Used by initEventBus.ts (subscription-based events) and
 * core/layoutApi.ts (layout lifecycle events).
 */
export function dispatchCyWebEvent<K extends keyof CyWebEvents>(
  type: K,
  detail: CyWebEvents[K],
): void {
  window.dispatchEvent(new CustomEvent(type, { detail }))
}
```

This function is the **only place** where `new CustomEvent` is called for CyWeb events. All
dispatch sites import and call this helper, ensuring the type constraint is enforced uniformly.

### 1.6 `initEventBus` — Internal Subscription Setup

```typescript
// src/app-api/event-bus/initEventBus.ts
// Internal — never exposed via Module Federation.

import { shallowEqual } from 'zustand/shallow'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { dispatchCyWebEvent } from './dispatchCyWebEvent'

export function initEventBus(): void {
  // --- network:created / network:deleted ---
  useWorkspaceStore.subscribe(
    (state) => state.networkIds,
    (curr, prev) => {
      const prevSet = new Set(prev)
      const currSet = new Set(curr)
      for (const id of currSet) {
        if (!prevSet.has(id)) dispatchCyWebEvent('network:created', { networkId: id })
      }
      for (const id of prevSet) {
        if (!currSet.has(id)) dispatchCyWebEvent('network:deleted', { networkId: id })
      }
    },
  )

  // --- network:switched ---
  useWorkspaceStore.subscribe(
    (state) => state.currentNetworkId,
    (networkId, previousId) => {
      if (networkId !== previousId) {
        dispatchCyWebEvent('network:switched', { networkId, previousId })
      }
    },
  )

  // --- selection:changed ---
  useViewModelStore.subscribe(
    (state) => {
      const networkId = useWorkspaceStore.getState().currentNetworkId
      const view = state.viewModelMap.get(networkId)
      return {
        networkId,
        selectedNodes: view?.selectedNodes ?? [],
        selectedEdges: view?.selectedEdges ?? [],
      }
    },
    ({ networkId, selectedNodes, selectedEdges }) => {
      dispatchCyWebEvent('selection:changed', { networkId, selectedNodes, selectedEdges })
    },
    { equalityFn: shallowEqual },
  )

  // --- style:changed ---
  useVisualStyleStore.subscribe(
    (state) => state.visualStyles,
    (curr, prev) => {
      for (const [networkId, style] of curr.entries()) {
        const prevStyle = prev.get(networkId)
        if (prevStyle === style) continue
        // Emit one event per changed property
        for (const property of Object.keys(style) as string[]) {
          if ((style as any)[property] !== (prevStyle as any)?.[property]) {
            dispatchCyWebEvent('style:changed', { networkId, property })
          }
        }
      }
    },
  )

  // --- data:changed ---
  useTableStore.subscribe(
    (state) => state.tables,
    (curr, prev) => {
      for (const [networkId, tables] of curr.entries()) {
        const prevTables = prev.get(networkId)
        if (!prevTables) continue
        const tableTypes = ['node', 'edge'] as const
        for (const tableType of tableTypes) {
          const currTable = tables[tableType]
          const prevTable = prevTables[tableType]
          if (currTable === prevTable) continue
          const rowIds = detectChangedRowIds(currTable, prevTable)
          dispatchCyWebEvent('data:changed', { networkId, tableType, rowIds })
        }
      }
    },
  )
}
```

`layout:started` and `layout:completed` are not set up here — they are dispatched directly from
`core/layoutApi.ts` via `dispatchCyWebEvent`. See [§ 1.4.5](#145-layoutstarted) and
[§ 1.4.6](#146-layoutcompleted).

### 1.7 React Hook — `useCyWebEvent`

```typescript
// src/app-api/useCyWebEvent.ts
// Exposed as cyweb/EventBus

import { useEffect } from 'react'
import type { CyWebEvents } from './event-bus/CyWebEvents'

/**
 * React hook that subscribes to a typed CyWeb event.
 * The listener is automatically removed when the component unmounts.
 *
 * @param eventType - The event name (key of CyWebEvents)
 * @param handler   - Callback receiving the typed event detail
 *
 * @example
 * useCyWebEvent('selection:changed', ({ selectedNodes }) => {
 *   setCount(selectedNodes.length)
 * })
 */
export function useCyWebEvent<K extends keyof CyWebEvents>(
  eventType: K,
  handler: (detail: CyWebEvents[K]) => void,
): void {
  useEffect(() => {
    const listener = (e: Event): void => {
      handler((e as CustomEvent<CyWebEvents[K]>).detail)
    }
    window.addEventListener(eventType, listener)
    return () => {
      window.removeEventListener(eventType, listener)
    }
  }, [eventType, handler])
}
```

**Handler stability:** `handler` is listed as a `useEffect` dependency. If the handler is defined
inline in the component body, it will be a new function reference on every render, causing the
effect to re-run and re-subscribe unnecessarily. Callers should wrap their handler in `useCallback`
to produce a stable reference:

```typescript
const handleSelection = useCallback(({ selectedNodes }) => {
  setCount(selectedNodes.length)
}, []) // add deps if the handler closes over reactive values

useCyWebEvent('selection:changed', handleSelection)
```

This is consistent with the React ecosystem convention for stable callback refs.

### 1.8 Vanilla JS Consumption

Vanilla JS consumers call `window.addEventListener` directly. The `cywebapi:ready` event (see
[§ 1.9](#19-initialization-sequence)) signals that both `window.CyWebApi` and the event bus are
ready.

**Basic usage:**

```javascript
// Browser extension content script or plain <script> tag
window.addEventListener('cywebapi:ready', () => {
  window.addEventListener('selection:changed', (e) => {
    const { networkId, selectedNodes, selectedEdges } = e.detail
    console.log(`Network ${networkId}: ${selectedNodes.length} nodes selected`)
  })

  window.addEventListener('network:switched', (e) => {
    console.log('Active network changed to', e.detail.networkId)
  })
})
```

**Late-loading consumers** (script loads after `cywebapi:ready` has already fired):

```javascript
function onApiReady(callback) {
  if (window.CyWebApi) {
    callback() // already initialized
  } else {
    window.addEventListener('cywebapi:ready', callback, { once: true })
  }
}

onApiReady(() => {
  window.addEventListener('layout:completed', (e) => {
    console.log('Layout finished for', e.detail.networkId, 'via', e.detail.algorithm)
  })
})
```

### 1.9 Initialization Sequence

The event bus is initialized in `src/init.tsx` as part of the app startup sequence, after all
stores are hydrated and `window.CyWebApi` is assigned:

```typescript
// src/init.tsx  (relevant excerpt — order matters)

// 1. Stores hydrate from IndexedDB (async, awaited before this point)

// 2. Assign facade API to window
window.CyWebApi = CyWebApi  // assembled from core/ domain objects

// 3. Initialize event bus subscriptions (after stores are hydrated)
initEventBus()

// 4. Signal readiness to vanilla JS consumers
window.dispatchEvent(new CustomEvent('cywebapi:ready'))
```

**Ordering invariants:**

- `initEventBus()` must run **after** store hydration to suppress spurious `network:created` events
  for persisted networks (see [§ 1.4.1](#141-networkcreated)).
- `cywebapi:ready` must be dispatched **after** both `window.CyWebApi = CyWebApi` and
  `initEventBus()` to guarantee that consumers who react to `cywebapi:ready` can safely call both
  `window.CyWebApi` methods and attach event listeners.
- `cywebapi:ready` is **not** part of `CyWebEvents` and is not typed in `CyWebEventMap`. It is an
  internal signaling mechanism only.

### 1.10 Module Federation Exposure

Only `useCyWebEvent` is exposed via Module Federation. `initEventBus`, `dispatchCyWebEvent`,
and `CyWebEvents` are internal implementation details.

```javascript
// webpack.config.js (ModuleFederationPlugin.exposes)
exposes: {
  './EventBus': './src/app-api/useCyWebEvent',
  // ... other facade entries
}
```

React app consumers import as:

```typescript
import { useCyWebEvent } from 'cyweb/EventBus'
```

### 1.11 TypeScript Global Augmentation for Vanilla JS

Install `@cytoscape-web/api-types` (P1 item, see
[module-federation-design.md § 1.3](../module-federation-design.md)) and reference it in
`tsconfig.json`:

```json
{ "compilerOptions": { "types": ["@cytoscape-web/api-types"] } }
```

The package declares the global augmentation:

```typescript
// @cytoscape-web/api-types/global.d.ts

import type { CyWebEventMap, CyWebApiType } from '.'

declare global {
  interface WindowEventMap extends CyWebEventMap {}
  interface Window {
    CyWebApi: CyWebApiType
  }
}
```

After referencing the package, `window.addEventListener` calls are fully typed without any
imports in the consuming file:

```typescript
window.addEventListener('selection:changed', (e) => {
  // e.detail: { networkId: string; selectedNodes: string[]; selectedEdges: string[] }
  const { selectedNodes } = e.detail  // typed
})
```

---

## 2. Implementation Details

### 2.1 Store Subscription Mapping

| Event              | Store             | Selector                                     | Equality check |
| ------------------ | ----------------- | -------------------------------------------- | -------------- |
| `network:created`  | WorkspaceStore    | `state.networkIds`                           | Reference      |
| `network:deleted`  | WorkspaceStore    | `state.networkIds`                           | Reference      |
| `network:switched` | WorkspaceStore    | `state.currentNetworkId`                     | `===`          |
| `selection:changed`| ViewModelStore    | view for `currentNetworkId` (nodes + edges)  | `shallowEqual` |
| `layout:started`   | —                 | dispatched from `core/layoutApi.ts`          | —              |
| `layout:completed` | —                 | dispatched from `core/layoutApi.ts`          | —              |
| `style:changed`    | VisualStyleStore  | `state.visualStyles`                         | Reference      |
| `data:changed`     | TableStore        | `state.tables`                               | Reference      |

All subscriptions use the two-argument form of `zustand/subscribeWithSelector`:
`store.subscribe(selector, callback, options?)`. The `subscribeWithSelector` middleware is already
enabled on all stores.

### 2.2 Edge Cases and Invariants

**`network:switched` with `previousId === ''`**
The first time a network becomes active (workspace starts empty, user creates one), `previousId`
will be `''`. Consumers should treat `previousId === ''` as "no previous network" rather than a
network with an empty string ID.

**`selection:changed` across network switches**
When the active network changes, `selection:changed` will fire if the newly-active network has a
different selection state than the previous one. This is correct behavior — the consumer sees the
selection for whichever network is currently active.

**`data:changed` with empty `rowIds`**
A schema change (e.g., `createColumn`) modifies the table structure without changing any row
values. In this case, `rowIds` will be `[]`. Consumers who only care about value changes may
guard with `if (rowIds.length > 0)`.

**`style:changed` during initial style application**
When a network is first loaded, visual style defaults are applied. These mutations fire
`style:changed` events. Consumers should not assume that `style:changed` implies a user action.

**`layout:started` / `layout:completed` parity**
If `applyLayout` fails before dispatching `layout:started` (e.g., `LayoutEngineNotFound`),
neither event is dispatched. If `layout:started` is dispatched and the layout then errors
mid-execution (rare), `layout:completed` is **not** dispatched. Consumers should not assume
`layout:completed` always follows `layout:started`.

### 2.3 Performance Considerations

**`style:changed`** fires per property change. If a user adjusts a color-picker and each drag
event causes a store write, the event bus will emit one event per write. Consumers running
expensive re-renders should debounce on their end:

```typescript
// Consumer-side debounce (React)
const handleStyleChange = useMemo(
  () => debounce(({ networkId }) => rebuildStylePanel(networkId), 100),
  [],
)
useCyWebEvent('style:changed', handleStyleChange)
```

**`data:changed` on bulk writes** batches all affected row IDs into a single event. Consumers
do not receive N events for N rows — they receive one event with an array of N IDs. No consumer-
side batching is needed for bulk operations.

**`selection:changed`** uses `shallowEqual` to prevent re-fires when the same node set is
re-selected. This is sufficient for typical usage because selection arrays are replaced by
reference when the selection changes.

---

## 3. Testing Strategy

### 3.1 Unit Tests — `initEventBus`

**File:** `src/app-api/event-bus/initEventBus.test.ts`
**Approach:** Plain Jest, no `renderHook`. Mock `window.dispatchEvent` and drive store mutations
directly via `.setState()`.

```typescript
// Pattern for each event type
it('dispatches network:created when a network is added', () => {
  const spy = jest.spyOn(window, 'dispatchEvent')
  initEventBus()

  act(() => {
    useWorkspaceStore.setState((s) => ({
      networkIds: [...s.networkIds, 'new-network-1'],
    }))
  })

  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'network:created',
      detail: { networkId: 'new-network-1' },
    }),
  )
})
```

**Test cases per event type:**

| Event              | Test cases                                                                        |
| ------------------ | --------------------------------------------------------------------------------- |
| `network:created`  | Add one ID; add multiple IDs simultaneously; hydration suppression                |
| `network:deleted`  | Remove one ID; remove multiple IDs                                                |
| `network:switched` | ID changes; ID unchanged (no event); `previousId` is `''` on first switch        |
| `selection:changed`| Nodes change; edges change; same array reference (no event); network switch       |
| `layout:started`   | (tested in `layoutApi.test.ts` — see § 3.3)                                      |
| `layout:completed` | (tested in `layoutApi.test.ts` — see § 3.3)                                      |
| `style:changed`    | Single property changes; multiple properties in one mutation; no-op mutation      |
| `data:changed`     | Single row changes; bulk change; schema change (empty `rowIds`)                  |

### 3.2 Hook Tests — `useCyWebEvent`

**File:** `src/app-api/useCyWebEvent.test.ts`
**Approach:** `renderHook` from `@testing-library/react`.

```typescript
it('calls handler when matching event is dispatched', () => {
  const handler = jest.fn()
  const { unmount } = renderHook(() =>
    useCyWebEvent('selection:changed', handler),
  )

  act(() => {
    window.dispatchEvent(
      new CustomEvent('selection:changed', {
        detail: { networkId: 'n1', selectedNodes: ['a'], selectedEdges: [] },
      }),
    )
  })

  expect(handler).toHaveBeenCalledWith({
    networkId: 'n1',
    selectedNodes: ['a'],
    selectedEdges: [],
  })

  // Verify cleanup on unmount
  unmount()
  act(() => {
    window.dispatchEvent(new CustomEvent('selection:changed', { detail: {} }))
  })
  expect(handler).toHaveBeenCalledTimes(1) // not called again
})
```

**Additional hook test cases:**
- Different event types do not cross-fire
- Handler reference changes cause re-subscription (confirm via call count)
- `useCallback`-wrapped handler does not re-subscribe on re-render

### 3.3 Integration Tests — Layout Events

**File:** `src/app-api/core/layoutApi.test.ts`

Layout events originate in `core/layoutApi.ts`, so they are tested as part of the layout API
unit tests, not in `initEventBus.test.ts`:

```typescript
it('dispatches layout:started then layout:completed on applyLayout', async () => {
  const spy = jest.spyOn(window, 'dispatchEvent')
  const api = layoutApi

  await api.applyLayout(networkId, 'circular')

  const calls = spy.mock.calls.map((c) => (c[0] as CustomEvent).type)
  expect(calls).toContain('layout:started')
  expect(calls).toContain('layout:completed')
  expect(calls.indexOf('layout:started')).toBeLessThan(
    calls.indexOf('layout:completed'),
  )
})

it('dispatches neither layout event when algorithm is not found', async () => {
  const spy = jest.spyOn(window, 'dispatchEvent')
  await layoutApi.applyLayout(networkId, 'nonexistent-layout')
  const types = spy.mock.calls.map((c) => (c[0] as CustomEvent).type)
  expect(types).not.toContain('layout:started')
  expect(types).not.toContain('layout:completed')
})
```

### 3.4 Smoke Test — `cywebapi:ready`

**File:** `src/init.test.ts` (or the existing app initialization test file)

```typescript
it('dispatches cywebapi:ready after CyWebApi is assigned', () => {
  const readyHandler = jest.fn()
  window.addEventListener('cywebapi:ready', readyHandler)

  // Simulate init sequence
  simulateAppInit()

  expect(readyHandler).toHaveBeenCalledTimes(1)
  expect(window.CyWebApi).toBeDefined()
})
```

---

## 4. Design Decisions

### 4.1 Why `CustomEvent` on `window` Rather Than a Pub/Sub Library

**Alternatives considered:** `mitt`, `eventemitter3`, `EventEmitter` (Node polyfill), RxJS
`Subject`, React Context.

**Decision:** Native `CustomEvent` on `window`.

A pub/sub library would require a shared singleton (e.g., exported from a module). External apps
that consume events via Module Federation could import the singleton, but Vanilla JS consumers
(browser extensions, content scripts, unbundled scripts) cannot import ES modules without a
bundler. Passing the singleton through `window.CyWebApi` would tie event subscription to the
API object rather than the browser's standard event model.

`CustomEvent` on `window` has no runtime dependency, works in all browsing contexts, and is
debuggable directly in DevTools. The only cost is that each consumer must call
`window.addEventListener` individually (no `once`, `off`, or observable patterns built in). The
`useCyWebEvent` hook provides a React-idiomatic wrapper that handles this cost for React consumers.

### 4.2 Why One Hook (`useCyWebEvent`) Instead of Per-Event Hooks

**Alternative:** `useNetworkCreated`, `useSelectionChanged`, etc. — one typed hook per event type.

**Decision:** Single generic `useCyWebEvent<K>` hook.

Per-event hooks would require 8+ hook files and a corresponding Module Federation entry for each,
or a single combined file that exports all of them. The generic hook achieves the same type
safety via TypeScript's mapped type inference: the `K extends keyof CyWebEvents` constraint
automatically narrows the `handler` argument to the correct detail type for each event. External
apps import one entry point (`cyweb/EventBus`) and call one function, which is simpler to
document and maintain.

### 4.3 Why Layout Events Are Dispatched from `layoutApi.ts` Rather Than a Store Subscription

**Alternative:** Add `layoutStatus: 'idle' | 'running'` to `ViewModelStore`, subscribe to it.

**Decision:** Dispatch directly from `core/layoutApi.ts`.

Layout execution is an async operation initiated through the facade API. Adding store state purely
to carry layout status for the event bus would introduce state that serves no other purpose.
Layout status is transient — it exists only during the `applyLayout` call — and is not useful to
other parts of the application. Dispatching directly from the function that starts and awaits the
layout is the minimal, dependency-free approach.

### 4.4 Throttling Policy — No Built-in Throttle

**Decision:** The event bus does not throttle or debounce by default.

Each event represents a real state change in a Zustand store. Throttling at the event bus level
would require choosing a default interval that may be too slow for some consumers and too fast for
others. Consumers are in the best position to decide their update frequency and should apply
their own debounce/throttle when needed. `data:changed` already batches within a single store
mutation, which is the most common source of high-frequency writes.
