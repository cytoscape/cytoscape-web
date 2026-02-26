// packages/api-types/src/index.ts
//
// Entry point for @cytoscape-web/api-types.
//
// Consumers who add this package to their tsconfig `types` array get:
//   - Full type information for window.CyWebApi
//   - Typed window.addEventListener overloads for all CyWeb events
//   - All public model types (IdType, Network, Table, etc.)
//   - ApiResult<T>, ApiErrorCode, and helper types

import type { CyWebEventMap } from './events'
import type { CyWebApiType } from './CyWebApi'

// ── App API types (result types + model re-exports) ───────────────
export * from '../../../src/app-api/types'

// ── Event bus types ────────────────────────────────────────────────
export type { CyWebEvents, CyWebEventMap } from './events'

// ── Global window type ─────────────────────────────────────────────
export type { CyWebApiType } from './CyWebApi'

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
     *   const api = window.CyWebApi
     *   const result = api.network.getCurrentNetwork()
     * })
     * ```
     */
    CyWebApi: CyWebApiType
  }
}
