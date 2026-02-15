# Module Federation Facade API Design and Priorities

**Rev. 1 (2/11/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**

Solution proposals for the issues identified in [module-federation-audit.md](module-federation-audit.md).

---

## 1. Priorities

### P0 (Blockers — App development is impossible without these)

#### 1.1 Design and Implement Facade API Layer

The primary public API for external apps is a **facade layer** (`src/app-api/`) consisting of domain-specific hooks. See [facade-api-specification.md](facade-api-specification.md) for the full design.

Instead of directly exposing individual internal hooks or raw stores, the facade provides:

- A **stable public contract** independent of internal store implementation
- **Validated, typed operations** with consistent `ApiResult<T>` returns
- Coverage for all critical gaps identified in the audit (element CRUD, layout execution, viewport control, CX2 export)

The facade wraps existing internal hooks (`useCreateNode`, `useCreateEdge`, `useDeleteNodes`, etc.) and stores (`RendererFunctionStore`, `LayoutStore`, etc.) as implementation details. External apps import only from facade modules:

```
cyweb/ElementApi      → Node/edge CRUD (wraps useCreateNode, useCreateEdge, etc.)
cyweb/NetworkApi      → Network lifecycle (wraps useCreateNetwork, useCreateNetworkFromCx2, etc.)
cyweb/SelectionApi    → Selection operations (wraps ViewModelStore selection methods)
cyweb/TableApi        → Table data operations (wraps TableStore)
cyweb/VisualStyleApi  → Visual style operations (wraps VisualStyleStore)
cyweb/LayoutApi       → Layout execution (new coordination: LayoutStore + LayoutEngine + ViewModelStore)
cyweb/ViewportApi     → Viewport control (wraps RendererFunctionStore + ViewModelStore)
cyweb/ExportApi       → CX2 export (wraps exportCyNetworkToCx2)
cyweb/ApiTypes        → Shared types (ApiResult, ApiErrorCode, re-exported model types)
```

Internal hooks and stores needed by the facade but not currently exposed (e.g., `RendererFunctionStore` for viewport control, layout execution coordination) are used internally by the facade — they are NOT independently exposed via Module Federation. This ensures external apps have a single, well-designed entry point and are insulated from internal refactoring.

#### 1.2 Deprecate Raw Store Exposure

The existing 12 raw store exports and 2 legacy task hooks remain available for backward compatibility but are marked `@deprecated`. New external apps should use the facade API exclusively. See [facade-api-specification.md § 2.4](facade-api-specification.md) for the deprecation timeline.

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

#### 1.4 Runtime Dynamic App Registration

Remove build-time dependency on `apps.json` + `app-definition.ts`:

- Runtime dynamic module loading (`new Function` or `importScripts` based)
- URL-based app registration UI
- Manifest validation

#### 1.5 Introduce Event Bus

Typed event system:

```typescript
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
  'layout:completed': { networkId: IdType }
  'style:changed': { networkId: IdType; property: string }
  'data:changed': { networkId: IdType; tableType: string; rowIds: IdType[] }
}
```

#### 1.6 Add CX2 Validation

Add `validateCX2()` to `useCreateNetworkFromCx2` to prevent store corruption from invalid data.

### P2 (Improvements — Better developer experience)

#### 1.7 Define App Lifecycle Contract

The current `CyApp` interface is purely declarative metadata (`id`, `name`, `components`). External apps have no supported lifecycle hooks for initialization or cleanup.

Add `mount(context)` and `unmount()` lifecycle callbacks to the app contract:

- **`mount(context)`** — Called when the app is activated. Receives an `AppContext` object providing access to all facade APIs. Use for initializing app state, registering event listeners, and preparing resources.
- **`unmount()`** — Called when the app is deactivated or unloaded. Apps must clean up DOM nodes, listeners, timers, and async tasks. No async work should survive past `unmount()`.

The `AppContext` type is exported via `cyweb/ApiTypes`. See [facade-api-specification.md § 1.5.9](facade-api-specification.md) for the full specification.

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

> Full facade design and Module Federation integration details are in [facade-api-specification.md](facade-api-specification.md).
> Detailed type infrastructure design is in [phase1a-shared-types-design.md](phase1a-shared-types-design.md).

Design the facade API surface first, then implement incrementally. Each sub-phase delivers working code with tests. **Example apps** in [cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples) are updated as validation targets alongside each API sub-phase. The phase is complete when multiple toy examples run end-to-end against the facade API.

The facade is the **only new public API** — internal hooks and stores are created or modified as needed to support the facade, but are not independently exposed.

#### Step 0: Foundation Types

1. Define shared types (`ApiResult<T>`, `ApiErrorCode`) and public type re-exports
2. Create `src/app-api/types/` directory structure with barrel exports
3. Add `cyweb/ApiTypes` entry to `webpack.config.js`
4. Unit tests for `ApiResult` helpers (`ok`, `fail`, type guards)
5. Behavioral documentation (`src/app-api/api_docs/Api.md`)

> Design: [phase1a-shared-types-design.md](phase1a-shared-types-design.md) · ADRs: [0001](../../../docs/adr/0001-api-result-discriminated-union.md), [0002](../../../docs/adr/0002-public-type-reexport-strategy.md)

#### Step 1: Facade Hook Implementation (5 sub-phases)

Each sub-phase produces: facade hook source → unit tests → webpack entry → behavioral docs.

**1a: Element API** (`useElementApi`)

- Node/edge CRUD: `createNode`, `createEdge`, `deleteNodes`, `deleteEdges`, `getNode`, `getEdge`, `moveEdge`
- Wraps: `useCreateNode`, `useCreateEdge`, `useDeleteNodes`, `useDeleteEdges`

**1b: Network API** (`useNetworkApi`)

- Network lifecycle: `createNetworkFromEdgeList`, `createNetworkFromCx2`, `deleteNetwork`
- Includes CX2 validation fix (P0 item 1.6)
- Wraps: `useCreateNetworkWithView`, `useCreateNetworkFromCx2`
- **Example validation**: Migrate `hello-world/CreateNetworkMenu` and `CreateNetworkFromCx2Menu` from raw stores/hooks to `useNetworkApi`

**1c: Selection + Viewport API** (`useSelectionApi`, `useViewportApi`)

- Selection: `exclusiveSelect`, `additiveSelect`, `toggleSelected`, `getSelection`
- Viewport: `fit`, `getNodePositions`, `updateNodePositions`
- **Example validation**: Add selection/viewport demo to `hello-world/HelloPanel`

**1d: Table + Visual Style API** (`useTableApi`, `useVisualStyleApi`)

- Table: `getValue`, `getRow`, `createColumn`, `setValue`, `setValues`
- Visual style: `setDefault`, `setBypass`, `createDiscreteMapping`, `createPassthroughMapping`
- **Example validation**: Update `simple-panel` to read/display table data via facade API

**1e: Layout + Export API** (`useLayoutApi`, `useExportApi`)

- Layout: `applyLayout`, `getAvailableLayouts`
- Export: `exportToCx2`
- **Example validation**: Create `network-generator` toy example (create → layout → fit → export)

#### Step 2: Webpack Integration and Deprecation

1. Add all 9 facade entries to `webpack.config.js` (`ModuleFederationPlugin.exposes`)
2. Mark existing 12 store exports and 2 task hooks `@deprecated` in JSDoc
3. Verify backward compatibility — existing examples still function with deprecated imports

#### Step 3: Example Repository Overhaul

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

#### Step 4: Bug Fixes

Fix existing bugs identified in the audit (Section 7). Addressed opportunistically as related facade hooks are implemented.

#### Phase 1 Exit Criteria

- [ ] All 8 facade hooks implemented with unit tests
- [ ] `ApiResult<T>` and type re-exports verified via `cyweb/ApiTypes`
- [ ] `hello-world` runs end-to-end using only facade API (no raw store imports)
- [ ] `network-generator` toy example creates, lays out, styles, and exports a network
- [ ] `simple-menu` and `simple-panel` run end-to-end using facade API
- [ ] Legacy store-based examples still function (backward compatibility)
- [ ] `project-template` updated for new developers to use facade API
- [ ] `patterns/` documentation reflects facade API usage

### Phase 2: Developer Experience

1. Design and implement event bus
2. Dynamic app registration mechanism
3. API reference documentation
4. Starter template

### Phase 3: Extensibility

1. App Lifecycle contract (`AppContext`, `CyAppWithLifecycle`)
2. Expand UI integration points
3. Expose CX2 export API
4. Inter-app communication protocol
5. Security sandbox evaluation

---

## 3. Timeline

### Phase 1: Facade API Implementation and Example Validation

- **Goal**: Implement facade API and validate with working toy examples end-to-end

| Milestone                     | Deliverables                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Step 0: Foundation types      | `ApiResult.ts`, `ElementTypes.ts`, barrel exports, unit tests, `cyweb/ApiTypes` webpack entry                     |
| Step 1a: Element API          | `useElementApi.ts`, unit tests, `cyweb/ElementApi` webpack entry                                                  |
| Step 1b: Network API          | `useNetworkApi.ts`, CX2 validation fix, unit tests, **first example migration** (`hello-world` CreateNetworkMenu) |
| Step 1c: Selection + Viewport | `useSelectionApi.ts`, `useViewportApi.ts`, unit tests, HelloPanel demo update                                     |
| Step 1d: Table + Visual Style | `useTableApi.ts`, `useVisualStyleApi.ts`, unit tests, `simple-panel` migration                                    |
| Step 1e: Layout + Export      | `useLayoutApi.ts`, `useExportApi.ts`, unit tests, `network-generator` example                                     |
| Step 2: Integration           | Webpack config finalization, `@deprecated` markers, backward compatibility verification                           |
| Step 3: Examples & Docs       | Example repo overhaul complete, `project-template` update, end-to-end validation, bug fixes                       |

**Key dependencies:**

- Steps 1a–1e are sequential (each builds on shared types from Step 0)
- Example migrations in Step 3 begin incrementally after Step 1b (Network API is the minimum for `hello-world`)
- Parallel work: unit tests alongside implementation; example migration starts as APIs become available

**Milestones (checkpoints):**

| Checkpoint                | Verification                                                                |
| ------------------------- | --------------------------------------------------------------------------- |
| First toy example working | `hello-world/CreateNetworkMenu` creates a network via `useNetworkApi`       |
| Core APIs complete        | All 8 facade hooks pass unit tests                                          |
| E2E example suite         | `network-generator` runs full workflow (create → layout → style → export)   |
| Phase 1 complete          | All exit criteria met, `facade-api` branch ready for merge in examples repo |

### Phase 2: Developer Experience (TBD)

### Phase 3: Extensibility (TBD)
