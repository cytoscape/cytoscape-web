// src/app-api/index.ts

// ── Types (Phase 0) ──────────────────────────────────────────────
export * from './types'

// ── App API hooks (added in Phase 1a–1h) ─────────────────────────
// useContextMenuApi removed in Phase 2 — context menu access is now via
// AppContext.apis.contextMenu (per-app factory) or window.CyWebApi.contextMenu (anonymous).
export { useCyWebEvent } from './useCyWebEvent'         // Step 2: Event Bus
export { useElementApi } from './useElementApi'         // Phase 1a
export { useExportApi } from './useExportApi'           // Phase 1e
export { useLayoutApi } from './useLayoutApi'           // Phase 1e
export { useNetworkApi } from './useNetworkApi'         // Phase 1b
export { useSelectionApi } from './useSelectionApi'     // Phase 1c
export { useTableApi } from './useTableApi'             // Phase 1d
export { useViewportApi } from './useViewportApi'       // Phase 1c
export { useVisualStyleApi } from './useVisualStyleApi' // Phase 1d
export { useWorkspaceApi } from './useWorkspaceApi'     // Phase 1f
