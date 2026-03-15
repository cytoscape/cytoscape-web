// src/app-api/index.ts

// ── Types (Phase 0) ──────────────────────────────────────────────
export * from './types'

// ── App API hooks ────────────────────────────────────────────────
// Note: Context menu access is via AppContext.apis.contextMenu (per-app
// factory in mount()) or window.CyWebApi.contextMenu (anonymous singleton).
export { useCyWebEvent } from './useCyWebEvent'         // Event Bus
export { useElementApi } from './useElementApi'         // Phase 1a
export { useExportApi } from './useExportApi'           // Phase 1e
export { useLayoutApi } from './useLayoutApi'           // Phase 1e
export { useNetworkApi } from './useNetworkApi'         // Phase 1b
export { useSelectionApi } from './useSelectionApi'     // Phase 1c
export { useTableApi } from './useTableApi'             // Phase 1d
export { useViewportApi } from './useViewportApi'       // Phase 1c
export { useVisualStyleApi } from './useVisualStyleApi' // Phase 1d
export { useWorkspaceApi } from './useWorkspaceApi'     // Phase 1f
