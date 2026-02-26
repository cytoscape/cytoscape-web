# Store Creation Pattern

This specification defines how to create new Zustand stores in Cytoscape Web.

## Overview

All stores live in `src/data/hooks/stores/` and follow a consistent pattern using Zustand with Immer middleware. There are 16 stores total, categorized into three middleware tiers based on persistence and subscription needs.

## Prerequisites

- `enableMapSet()` from Immer must be called before any store initializes. This is already done in `src/init.tsx` and `jest-setup.ts`. If you create a new standalone test entry point, include it.
- Store type interfaces must be defined in `src/models/StoreModel/` before implementing the store.

## Step-by-Step

### 1. Define the Store Type Interface

Create `src/models/StoreModel/<Domain>StoreModel.ts`:

```typescript
// src/models/StoreModel/ExampleStoreModel.ts

import { IdType } from '../IdType'

export interface ExampleState {
  items: Map<IdType, ExampleItem>
  lastModified?: number
}

export interface ExampleActions {
  add: (item: ExampleItem) => void
  delete: (id: IdType) => void
  deleteAll: () => void
}

// Union type — always State & Actions
export type ExampleStore = ExampleState & ExampleActions
```

**Rules:**
- Separate state (data) from actions (behavior) as distinct interfaces
- The store type is always `State & Actions` union
- Use `IdType` (from `src/models/IdType.ts`) for all identifiers
- Use `readonly` on interface properties where mutation is not intended

### 2. Create Store Implementation Logic (Optional)

If the store has non-trivial logic, create `src/models/StoreModel/impl/<domain>StoreImpl.ts`:

```typescript
// src/models/StoreModel/impl/exampleStoreImpl.ts

import { IdType } from '../../IdType'
import { ExampleState } from '../ExampleStoreModel'

export interface ExampleStoreState {
  items: Map<IdType, ExampleItem>
}

export const add = (
  state: ExampleStoreState,
  item: ExampleItem,
): ExampleStoreState => {
  const newItems = new Map(state.items)
  newItems.set(item.id, item)
  return { ...state, items: newItems }
}

export const deleteItem = (
  state: ExampleStoreState,
  id: IdType,
): ExampleStoreState => {
  const newItems = new Map(state.items)
  newItems.delete(id)
  return { ...state, items: newItems }
}
```

**Rules:**
- Pure TypeScript functions only — no React, no Zustand
- Accept state as first parameter, return new state
- Never mutate the input state

### 3. Choose the Middleware Tier

Pick the appropriate middleware composition based on your store's needs:

#### Tier A: In-Memory Only

For transient state that does not need persistence or fine-grained subscriptions.

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const useExampleStore = create(
  immer<ExampleStore>((set) => ({
    // ... state and actions
  })),
)
```

**Used by:** RendererStore, CredentialStore, MessageStore, LayoutStore, RendererFunctionStore, UiStateStore

#### Tier B: With IndexedDB Persistence

For data that must survive page reloads. Requires a custom `persist` higher-order function.

```typescript
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const persist =
  (config: StateCreator<ExampleStore>) =>
  (
    set: StoreApi<ExampleStore>['setState'],
    get: StoreApi<ExampleStore>['getState'],
    api: StoreApi<ExampleStore>,
  ) =>
    config(
      async (args) => {
        const currentNetworkId =
          useWorkspaceStore.getState().workspace.currentNetworkId
        set(args)
        const updated = get().items.get(currentNetworkId)
        if (updated !== undefined) {
          await putItemToDb(updated)
        }
      },
      get,
      api,
    )

export const useExampleStore = create(
  immer<ExampleStore>(
    persist((set, get) => ({
      // ... state and actions
    })),
  ),
)
```

**Used by:** AppStore, VisualStyleStore, OpaqueAspectStore, NetworkSummaryStore, FilterStore

#### Tier C: Persistence + Selector Subscriptions

For stores that need both persistence and fine-grained selector subscriptions (e.g., other stores or components subscribe to specific slices).

```typescript
import { create, StateCreator, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// persist function same as Tier B...

export const useExampleStore = create(
  subscribeWithSelector(
    immer<ExampleStore>(
      persist((set, get) => ({
        // ... state and actions
      })),
    ),
  ),
)
```

**Used by:** NetworkStore, TableStore, ViewModelStore, WorkspaceStore, UndoStore

### 4. Implement Store Actions

Actions follow a consistent pattern — delegate logic to pure impl functions:

```typescript
export const useExampleStore = create(
  immer<ExampleStore>((set) => ({
    items: new Map(),

    add: (item: ExampleItem) => {
      set((state) => {
        const newState = ExampleStoreImpl.add(state, item)
        state.items = newState.items
        // Async DB persistence (fire-and-forget)
        void putItemToDb(item)
          .then(() => {
            logStore.info(`Item added to DB: ${item.id}`)
          })
          .catch((err) => {
            logStore.error(`Failed adding item to DB: ${err}`)
          })
        return state
      })
    },

    delete: (id: IdType) => {
      set((state) => {
        const newState = ExampleStoreImpl.deleteItem(state, id)
        state.items = newState.items
        void deleteItemFromDb(id)
        return state
      })
    },

    deleteAll: () => {
      set((state) => {
        state.items = new Map()
        void clearItemsFromDb()
        return state
      })
    },
  })),
)
```

**Rules:**
- Use `set((state) => { ... return state })` for Immer mutations
- Delegate logic to `*StoreImpl` pure functions when non-trivial
- DB operations are async fire-and-forget — never `await` inside `set()`
- DB errors are caught and logged, never propagated (prevents infinite loops)

### 5. Cross-Store Communication

Inside store actions, access other stores via `.getState()`:

```typescript
// Correct — inside a store action
const currentNetworkId =
  useWorkspaceStore.getState().workspace.currentNetworkId

// WRONG — never use hooks inside stores
const workspace = useWorkspaceStore() // This will crash
```

### 6. Logging

Use the structured `logStore` logger:

```typescript
import { logStore } from '../../../debug'

logStore.info(`[ExampleStore]: Item added: ${id}`)
logStore.warn(`[ExampleStore]: Item not found: ${id}`)
logStore.error(`[ExampleStore]: Failed to persist: ${err}`)
```

### 7. IndexedDB Serialization

When persisting objects that contain Maps or Immer proxies:

- **Plain objects:** Use `toPlainObject()` from `src/data/db/serialization/immerSerialization.ts`
- **Map-based data:** Use specialized serializers from `src/data/db/serialization/mapSerialization.ts` (`serializeTable`, `serializeVisualStyle`, `serializeNetworkView`)
- **Conversion happens inside store actions or DB functions**, not in the persist middleware itself

### 8. Module Federation Export (If Needed)

If the store must be accessible to external apps via Module Federation, add it to `webpack.config.js` exposes:

```javascript
exposes: {
  './useExampleStore': './src/data/hooks/stores/ExampleStore',
}
```

## Store Naming Convention

| Artifact | Location | Naming |
| --- | --- | --- |
| Store type interface | `src/models/StoreModel/<Domain>StoreModel.ts` | `<Domain>Store` (type) |
| Store impl functions | `src/models/StoreModel/impl/<domain>StoreImpl.ts` | Pure functions |
| Store hook | `src/data/hooks/stores/<Domain>Store.ts` | `use<Domain>Store` |

## Testing Pattern

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { enableMapSet } from 'immer'
import { useExampleStore } from '../ExampleStore'

// enableMapSet() is already called in jest-setup.ts

describe('ExampleStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    const { result } = renderHook(() => useExampleStore())
    act(() => {
      result.current.deleteAll()
    })
  })

  it('should add an item', async () => {
    const { result } = renderHook(() => useExampleStore())
    act(() => {
      result.current.add({ id: 'item-1', name: 'Test' })
    })
    await waitFor(() => {
      expect(result.current.items.get('item-1')).toBeDefined()
    })
  })
})
```

## Checklist

- [ ] Store type interface created in `src/models/StoreModel/`
- [ ] Impl functions created in `src/models/StoreModel/impl/` (if needed)
- [ ] Correct middleware tier selected
- [ ] Actions delegate to pure impl functions
- [ ] DB persistence uses fire-and-forget with error logging
- [ ] Cross-store access uses `.getState()`, not hooks
- [ ] Logging uses `logStore` from `debug`
- [ ] Tests use `renderHook` + `act` + `waitFor` pattern
- [ ] Module Federation export added (if needed)
