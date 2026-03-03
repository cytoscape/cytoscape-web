// packages/api-types/src/index.ts
//
// Entry point for @cytoscape-web/api-types.
//
// Consumers who add this package to their tsconfig `types` array get:
//   - Full type information for window.CyWebApi (all 9 domain APIs)
//   - Typed window.addEventListener overloads for all CyWeb events
//   - All public model types (IdType, Network, Table, etc.)
//   - All domain API types (ElementApi, NetworkApi, ..., WorkspaceApi)
//   - ApiResult<T>, ApiErrorCode, and helper types
//   - AppContext, CyAppWithLifecycle for apps implementing lifecycle hooks

import type { CyWebEventMap } from './events'
// Import for use in the global Window augmentation below.
// CyWebApiType is re-exported via `export *` — no separate export needed.
import type { CyWebApiType } from './CyWebApi'

// ── App API types + domain API types + model re-exports ────────────
// Includes: ApiResult, AppContext, CyAppWithLifecycle, CyWebApiType,
// ElementApi, NetworkApi, SelectionApi, ViewportApi, TableApi,
// VisualStyleApi, LayoutApi, ExportApi, WorkspaceApi, and all
// result/data types and model types.
export * from '../../../src/app-api/types'

// ── Event bus types ────────────────────────────────────────────────
export type { CyWebEvents, CyWebEventMap } from './events'

// ── Ambient global augmentation ────────────────────────────────────
// Adding this package to tsconfig `types` makes window.CyWebApi and
// typed window.addEventListener overloads available globally.
declare global {
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
