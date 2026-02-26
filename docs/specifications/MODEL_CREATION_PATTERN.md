# Model Creation Pattern

This specification defines how to create new domain models in Cytoscape Web.

## Overview

Models live in `src/models/` and represent the pure data layer. There are 18 model directories. Each model directory exports interfaces and pure implementation functions with zero framework dependencies (no React, no Zustand).

## Directory Structure

```
src/models/<Domain>Model/
├── <Domain>.ts              # Primary interface
├── <SubType>.ts             # Additional interfaces (if needed)
├── impl/
│   ├── <domain>Impl.ts      # Pure implementation functions
│   └── <domain>Impl.test.ts # Unit tests (co-located)
└── index.ts                 # Barrel export with <Domain>Fn default
```

## Step-by-Step

### 1. Create the Model Directory

```
src/models/ExampleModel/
```

### 2. Define Interfaces

Create the primary interface in `src/models/ExampleModel/Example.ts`:

```typescript
// src/models/ExampleModel/Example.ts

import { IdType } from '../IdType'

export interface Example {
  readonly id: IdType
  readonly name: string
  readonly items: readonly ExampleItem[]
}
```

For additional types, create separate files:

```typescript
// src/models/ExampleModel/ExampleItem.ts

import { IdType } from '../IdType'

export interface ExampleItem {
  readonly id: IdType
  readonly value: number
}
```

**Rules:**
- All properties use `readonly`
- Use `IdType` (from `src/models/IdType.ts`) for any unique identifier — nodes, edges, networks, etc.
- Use `readonly` arrays (`readonly T[]`) for immutable collections
- Interfaces must not import from React, Zustand, or any UI framework
- Keep interfaces minimal — one concern per interface

### 3. Create Implementation Functions

Create `src/models/ExampleModel/impl/exampleImpl.ts`:

```typescript
// src/models/ExampleModel/impl/exampleImpl.ts

import { IdType } from '../../IdType'
import { Example, ExampleItem } from '..'

/**
 * Create a new Example with the given id and name
 */
export const createExample = (id: IdType, name: string): Example => ({
  id,
  name,
  items: [],
})

/**
 * Add an item to the Example
 */
export const addItem = (
  example: Example,
  item: ExampleItem,
): Example => ({
  ...example,
  items: [...example.items, item],
})

/**
 * Remove an item by id
 */
export const removeItem = (
  example: Example,
  itemId: IdType,
): Example => ({
  ...example,
  items: example.items.filter((item) => item.id !== itemId),
})
```

**Rules:**
- Pure functions only — no side effects, no mutations
- Accept data as parameters, return new data
- Use spread operator or `Object.create` for immutable transformations
- No React, no Zustand, no DOM, no async operations
- Private classes can implement interfaces internally (see `NetworkImpl` in `networkImpl.ts`)

### 4. Create Barrel Export

Create `src/models/ExampleModel/index.ts`:

```typescript
// src/models/ExampleModel/index.ts

/**
 * Example-related interfaces
 *
 * All public functions should be accessed through the ExampleFn object
 */
import * as ExampleFn from './impl/exampleImpl'

export { Example } from './Example'
export { ExampleItem } from './ExampleItem'

export { ExampleFn as default }
```

**This enables two import styles:**

```typescript
// Import the function namespace
import ExampleFn from '../models/ExampleModel'
ExampleFn.createExample('id-1', 'Test')

// Import types directly
import { Example, ExampleItem } from '../models/ExampleModel'
```

### 5. Write Unit Tests

Create `src/models/ExampleModel/impl/exampleImpl.test.ts`:

```typescript
// src/models/ExampleModel/impl/exampleImpl.test.ts

import * as ExampleFn from './exampleImpl'

describe('ExampleModel', () => {
  describe('createExample', () => {
    it('should create an example with empty items', () => {
      const example = ExampleFn.createExample('id-1', 'Test')
      expect(example.id).toBe('id-1')
      expect(example.name).toBe('Test')
      expect(example.items).toEqual([])
    })
  })

  describe('addItem', () => {
    it('should add an item without mutating the original', () => {
      const example = ExampleFn.createExample('id-1', 'Test')
      const item = { id: 'item-1', value: 42 }
      const updated = ExampleFn.addItem(example, item)

      expect(updated.items).toHaveLength(1)
      expect(updated.items[0]).toEqual(item)
      // Original is unchanged
      expect(example.items).toHaveLength(0)
    })
  })
})
```

**Rules:**
- Tests are co-located in the same `impl/` directory
- File naming: `<domain>Impl.test.ts`
- Test pure functions directly — no need for `renderHook` or React testing utilities

## Existing Models Reference

| Model | Primary Interfaces | Key Concept |
| --- | --- | --- |
| NetworkModel | `Network`, `Node`, `Edge`, `GraphObject` | Graph topology (backed by Cytoscape.js headless) |
| TableModel | `Table`, `Column`, `ValueType`, `AttributeName` | Tabular data for node/edge attributes |
| VisualStyleModel | `VisualStyle`, `VisualProperty`, `VisualMappingFunction` | Visual style mappings |
| ViewModelModel | `NetworkView`, `NodeView`, `EdgeView` | Rendered view state (positions, sizes) |
| FilterModel | `Filter`, `FilterConfig`, `FilterWidgetType` | Data filtering definitions |
| UiModel | `Panel`, `PanelState` | UI layout state |
| WorkspaceModel | `Workspace` | Workspace containing networks |
| CxModel | CX2 format types | External data format conversion |
| NetworkSummaryModel | `NetworkSummary` | Network metadata from NDEx |
| MessageModel | `Message` | User-facing messages |
| PropertyModel | `NetworkPropertyValue` | Generic property values |
| LayoutModel | `LayoutAlgorithm`, `LayoutEngine` | Layout algorithm definitions |
| RendererModel | `Renderer` | Renderer registration |
| RendererFunctionModel | `RendererFunction` | Renderer function registration |
| OpaqueAspectModel | `OpaqueAspect` | Passthrough CX2 aspects |
| AppModel | `CyApp`, `ServiceApp` | External app definitions |
| StoreModel | All `*Store` types | Store type contracts (see below) |

## StoreModel — The Contract Layer

`src/models/StoreModel/` is a special model directory that defines type contracts for all Zustand stores. It bridges Models and Stores:

```
src/models/StoreModel/
├── AppStoreModel.ts
├── NetworkStoreModel.ts
├── TableStoreModel.ts
├── WorkspaceStoreModel.ts
├── ...
├── impl/
│   ├── appStoreImpl.ts          # Pure store logic
│   ├── networkStoreImpl.ts
│   └── ...
└── index.ts
```

Each store model file defines the `State + Actions` type:

```typescript
// src/models/StoreModel/ExampleStoreModel.ts

export interface ExampleState { ... }
export interface ExampleActions { ... }
export type ExampleStore = ExampleState & ExampleActions
```

The `impl/` directory contains pure functions that operate on store state — these are called from the actual Zustand store actions in `src/data/hooks/stores/`.

## Dependency Rules

```
Models (src/models/)
  ├── Can import: other models, IdType
  ├── Cannot import: React, Zustand, stores, features, DB layer
  └── Exception: StoreModel/impl/ may import from other models

StoreModel (src/models/StoreModel/)
  ├── Can import: other model interfaces, IdType
  ├── StoreModel/impl/ can import: other model functions + interfaces
  └── Cannot import: React, Zustand, actual store hooks
```

## Checklist

- [ ] Interface file created with `readonly` properties and `IdType`
- [ ] Implementation functions are pure (no side effects, no framework imports)
- [ ] Barrel `index.ts` exports `<Domain>Fn as default` and named type exports
- [ ] Unit tests co-located in `impl/` directory
- [ ] If store integration needed: store type created in `src/models/StoreModel/`
- [ ] If store logic is non-trivial: impl functions created in `src/models/StoreModel/impl/`
