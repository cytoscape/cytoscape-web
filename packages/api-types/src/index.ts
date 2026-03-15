// packages/api-types/src/index.ts
//
// Entry point for @cytoscape-web/api-types.
//
// Consumers who add this package to their tsconfig `types` array get:
//   - Full type information for window.CyWebApi (all 10 domain APIs)
//   - Typed window.addEventListener overloads for all CyWeb events
//   - All public model types (IdType, Network, Table, etc.)
//   - All domain API types (ElementApi, NetworkApi, ..., ContextMenuApi)
//   - Phase 2 types (AppContextApis, ResourceApi, ResourceSlot, ResourceDeclaration, etc.)
//   - ApiResult<T>, ApiErrorCode, and helper types
//   - AppContext, AppContextApis, CyAppWithLifecycle for apps implementing lifecycle hooks

// Import for use in the global Window augmentation below.
// CyWebApiType is imported from ./CyWebApi (which reads from src/app-api/core)
// to avoid a duplicate-declaration conflict with the `export *` barrel below
// (which re-exports CyWebApiType from src/app-api/types via a different path).
import type { CyWebApiType } from './CyWebApi'
import type { CyWebEventMap } from './events'

// ── App API types + domain API types + model re-exports ────────────
// Includes: ApiResult, AppContext, CyAppWithLifecycle, CyWebApiType,
// ElementApi, NetworkApi, SelectionApi, ViewportApi, TableApi,
// VisualStyleApi, LayoutApi, ExportApi, WorkspaceApi, ContextMenuApi,
// ResourceApi, ResourceSlot, and all result/data types and model types.
export * from '../../../src/app-api/types'

// ── Event bus types ────────────────────────────────────────────────
export type { CyWebEventMap, CyWebEvents } from './events'

// ── Ambient global augmentation ────────────────────────────────────
// Adding this package to tsconfig `types` makes window.CyWebApi and
// typed window.addEventListener overloads available globally.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface WindowEventMap extends CyWebEventMap {}
  interface Window {
    /**
     * The Cytoscape Web App API, available after `cywebapi:ready` fires.
     *
     * @example
     * ```typescript
     * window.addEventListener('cywebapi:ready', () => {
     *   const api = window.CyWebApi  // typed as CyWebApiType
     *   const result = api.network.getCurrentNetwork()
     * })
     * ```
     */
    CyWebApi: CyWebApiType
  }
}
