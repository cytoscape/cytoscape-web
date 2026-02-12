# Module Federation Facade API Design and Priorities

**Rev. 1 (2/11/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**

Solution proposals for the issues identified in [module-federation-audit.md](module-federation-audit.md).

---

## 1. Priorities

### P0 (Blockers — App development is impossible without these)

#### 1.1 Design and Implement Facade API Layer

The primary public API for external apps is a **facade layer** (`src/data/api/`) consisting of domain-specific hooks. See [facade-api-specification.md](facade-api-specification.md) for the full design.

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

External apps should declare `@cytoscape-web/types` as a dev dependency for compile-time type checking. The facade API layer (Section 3) will additionally export facade-specific types (`ApiResult<T>`, `ApiErrorCode`, and task hook argument/return types) via the `cyweb/ApiTypes` Module Federation entry.

**Required fixes before the facade API can fully rely on the types package:**

1. **Add `Cx2` types to the package** — `CxModel` is currently excluded from both `index.ts` and `tsconfig.json`. The `CxModel/Cx2/` subdirectory contains pure type definitions with no external dependencies and must be exported, since the facade `NetworkApi` requires the `Cx2` type.
2. **Add missing store model definitions** — `StoreModel/index.ts` is missing exports for `UndoStoreModel` (file exists but not re-exported), `RendererFunctionStoreModel`, and `FilterStoreModel` (files do not exist).
3. **Declare peer dependencies for external types** — `RendererModel/Renderer.ts` imports `ReactElement` from `react` and `StoreModel/CredentialStoreModel.ts` imports `Keycloak` from `keycloak-js`. These must be declared as `peerDependencies` in the package to prevent install failures for consumers.
4. **Fix `impl/` leakage in barrel exports** — Six model `index.ts` files re-export from `./impl/` (`CyNetworkModel`, `FilterModel`, `NetworkModel`, `TableModel`, `VisualStyleModel`, `ViewModel`), but `tsconfig.json` excludes `impl/`. TypeScript still compiles these transitively, pulling in external dependencies (`debug`, `cytoscape`, `d3-scale`). These barrel exports need to be split so that type-only interfaces are exported from non-impl files, and implementation functions (`*Fn` default exports, `getBasicFilter`, etc.) are excluded from the types build.

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

### Phase 1: Facade API Design and Implementation

> Full facade design and Module Federation integration details are in [facade-api-specification.md](facade-api-specification.md).

Design the facade API surface first, then implement incrementally. The facade is the **only new public API** — internal hooks and stores are created or modified as needed to support the facade, but are not independently exposed.

1. Define shared types (`ApiResult<T>`, `ApiErrorCode`) and public type re-exports
2. Implement facade hooks in 5 incremental sub-phases
   - 1a: Types + Element API (`useElementApi`)
   - 1b: Network API (`useNetworkApi`, includes CX2 validation fix)
   - 1c: Selection + Viewport API (`useSelectionApi`, `useViewportApi`)
   - 1d: Table + Visual Style API (`useTableApi`, `useVisualStyleApi`)
   - 1e: Layout + Export API (`useLayoutApi`, `useExportApi`)
3. Update `webpack.config.js` — add facade entries, mark legacy stores/hooks `@deprecated`
4. Fix existing bugs (Audit Section 7)

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

