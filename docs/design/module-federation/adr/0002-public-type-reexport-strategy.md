# 0002: Public Type Re-export Strategy for Module Federation Boundary

## Status

Accepted

## Context

The app API layer exposes types to external apps via two paths: Module Federation
(`cyweb/ApiTypes`) for React app consumers, and `window.CyWebApi` for vanilla JS consumers
(browser extensions, LLM agent bridges). Both paths share the same type definitions.
External apps need domain model types (`IdType`, `Network`, `VisualPropertyName`, etc.) to call
app API operations and interpret results regardless of which access path they use.

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
| All `*StoreModel` interfaces                   | Store internals. External apps use app API hooks.                                        |

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

### Alternative 2: Rely solely on `@cytoscape-web/types` package (deprecated)

The npm package `@cytoscape-web/types` (v1.1.15) published model types from `src/models/`.
External apps could use it as a dev dependency.

**Deprecated (February 2026) — superseded by `@cytoscape-web/api-types`:**

The four unresolved issues that originally deferred this alternative
([module-federation-design.md § 1.3](../design/module-federation/module-federation-design.md))
were never fixed. Instead, Phase 0 delivered `@cytoscape-web/api-types` — a new npm workspace
package (`packages/api-types/`) built from scratch with a curated type surface via
`ElementTypes.ts`. It adds event bus declarations (`CyWebEvents`, `CyWebEventMap`) and ambient
`window.CyWebApi` / `WindowEventMap` augmentations that `@cytoscape-web/types` never provided.

`@cytoscape-web/types` has been marked as deprecated on the npm registry. External apps should
migrate to `@cytoscape-web/api-types@alpha`.

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
- React app consumers import from `cyweb/ApiTypes` — a single, predictable Module Federation path
- Vanilla JS consumers (browser extensions, LLM agent bridges via `window.CyWebApi`) use the same
  types at runtime; TypeScript declarations for these consumers reference the same `ElementTypes.ts`
  types via `remotes.d.ts` or ambient declarations in the consuming project
- Internal model refactoring (file moves, renames) requires updating only `ElementTypes.ts`, not external apps
- `@cytoscape-web/types` is deprecated; `@cytoscape-web/api-types` is the canonical npm package for external consumers

**Trade-offs:**

- Manual curation of the public type list — each new app API hook may require adding types to `ElementTypes.ts`
- `export type` means external apps cannot use these types in runtime checks (e.g., `instanceof`) — acceptable since all model types are interfaces, not classes
- `as const` value objects (`ValueTypeName`, `VisualPropertyName`) are the only runtime values crossing the boundary — these must remain dependency-free

**Related documents:**

- [phase0-shared-types-design.md](../design/module-federation/specifications/phase0-shared-types-design.md) § 3.3 — `ElementTypes.ts` full type list
- [phase0-shared-types-design.md](../design/module-federation/specifications/phase0-shared-types-design.md) § 7.2 — External dependency risk analysis
- [module-federation-design.md](../design/module-federation/module-federation-design.md) § 1.3 — `@cytoscape-web/types` package fix plan
- [ADR 0003](0003-framework-agnostic-core-layer.md) — Framework-agnostic core layer; `window.CyWebApi` consumers use these same types
