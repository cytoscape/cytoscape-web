# 0002: Public Type Re-export Strategy for Module Federation Boundary

## Status

Accepted

## Context

The facade API layer exposes types to external apps via Module Federation (`cyweb/ApiTypes`). External apps need domain model types (`IdType`, `Network`, `VisualPropertyName`, etc.) to call facade operations and interpret results.

These model types are defined internally in `src/models/` across ~20 subdirectories. Many model files transitively import runtime dependencies (`debug`, `cytoscape`, `d3-scale`, `react`, `keycloak-js`) through implementation files (`impl/`) or store model interfaces.

Two problems must be solved:

1. **Dependency isolation** — External apps must not be forced to install or bundle internal dependencies when they import types
2. **API surface control** — Not all internal types should be public. Exposing too many types creates a brittle contract that blocks internal refactoring.

## Decision

### Re-export mechanism

A dedicated `src/app-api/types/ElementTypes.ts` file re-exports selected model types using two strategies:

- **`export type`** for interfaces and type aliases — TypeScript erases these entirely at compile time, eliminating all transitive runtime dependencies
- **Plain `export`** for `as const` value objects (`ValueTypeName`, `VisualPropertyName`) — these are self-contained objects with no external dependencies

```typescript
// Safe: erased at compile time, no transitive deps
export type { CyNetwork } from '../../models/CyNetworkModel/CyNetwork'

// Safe: self-contained const object, no imports
export { ValueTypeName } from '../../models/TableModel/ValueTypeName'
```

### Barrel export control

`src/app-api/types/index.ts` uses **explicit named re-exports** (no `export *`). Every public type is listed individually, preventing accidental leakage if internal files gain development-only exports.

### Public type surface

The following types are included (grouped by domain):

| Domain       | Included Types                                                   | Reason                                                            |
| ------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Identity     | `IdType`                                                         | Universal ID type for all API operations                          |
| Table        | `AttributeName`, `ValueType`, `ValueTypeName`, `Table`, `Column` | Required for `useTableApi` parameters and return values           |
| Network      | `Network`, `Node`, `Edge`, `CyNetwork`, `NetworkSummary`         | Required for `useNetworkApi` and `useElementApi`                  |
| Visual Style | `VisualPropertyName`, `VisualStyle`                              | Required for `useVisualStyleApi`                                  |
| View         | `NetworkView`                                                    | Required for `useViewportApi` read operations                     |
| CX2          | `Cx2`                                                            | Required for `useNetworkApi` (import) and `useExportApi` (export) |

### Excluded types (with rationale)

| Type                                           | Reason                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `GraphObject`, `GraphObjectType`               | Internal base interface / enum. External apps use `Node` and `Edge`.                    |
| `NetworkAttributes`                            | Accessor on `CyNetwork`, not needed as a standalone import.                             |
| `OpaqueAspects`                                | Internal CX2 pass-through storage detail.                                               |
| `UndoRedoStack`                                | External apps must not manipulate the undo stack.                                       |
| `VisualProperty<T>`, `VisualPropertyValueType` | Internal style engine types. External apps use `VisualPropertyName` + primitive values. |
| `NodeView`, `EdgeView`, `View`                 | Internal view model granularity. External apps use `NetworkView`.                       |
| All `*StoreModel` interfaces                   | Store internals. External apps use facade hooks.                                        |

## Rationale

### Alternative 1: `export *` from model barrel (rejected)

```typescript
export * from '../../../models'
```

**Rejected because:**

- Exports ~100+ types including all implementation functions (`NetworkFn`, `TableFn`, etc.)
- Transitive `impl/` imports would pull in `debug`, `cytoscape`, `d3-scale` at runtime
- No control over public surface — any internal type rename would break external apps
- Barrel exports from `impl/` directories are a known issue (see `@cytoscape-web/types` tsconfig.json `exclude` list)

### Alternative 2: Rely solely on `@cytoscape-web/types` package (deferred)

The npm package `@cytoscape-web/types` (v1.1.15) already publishes model types. External apps could use it as a dev dependency.

**Deferred (not rejected) because:**

- The package currently excludes `CxModel` (needed for `Cx2` type)
- Missing store model exports (`UndoStoreModel`, `RendererFunctionStoreModel`, `FilterStoreModel`)
- `impl/` leakage in barrel exports needs fixing
- External `react` and `keycloak-js` not declared as peer dependencies

The package will be fixed separately ([module-federation-design.md § 1.3](../design/module-federation/module-federation-design.md)). Once fixed, `ElementTypes.ts` can delegate to the package. The re-export file acts as a stable indirection point regardless of where types are sourced.

### Alternative 3: Namespace object re-export (rejected)

```typescript
export const Types = { IdType, Network, ... } // Not possible for TS types
```

**Rejected because:**

- TypeScript types cannot be members of runtime objects
- Would require a different import pattern (`Types.IdType` vs `IdType`)
- Breaks tree-shaking

## Consequences

**Affected areas:**

- `src/app-api/types/ElementTypes.ts` is the single file to update when adding new public types
- External apps import from `cyweb/ApiTypes` — a single, predictable import path
- Internal model refactoring (file moves, renames) requires updating only `ElementTypes.ts`, not external apps
- When `@cytoscape-web/types` package issues are fixed, the re-export source changes but the public surface remains identical

**Trade-offs:**

- Manual curation of the public type list — each new facade hook may require adding types to `ElementTypes.ts`
- `export type` means external apps cannot use these types in runtime checks (e.g., `instanceof`) — acceptable since all model types are interfaces, not classes
- `as const` value objects (`ValueTypeName`, `VisualPropertyName`) are the only runtime values crossing the boundary — these must remain dependency-free

**Related documents:**

- [phase1a-shared-types-design.md](../design/module-federation/phase1a-shared-types-design.md) § 3.3 — `ElementTypes.ts` full type list
- [phase1a-shared-types-design.md](../design/module-federation/phase1a-shared-types-design.md) § 7.2 — External dependency risk analysis
- [module-federation-design.md](../design/module-federation/module-federation-design.md) § 1.3 — `@cytoscape-web/types` package fix plan
