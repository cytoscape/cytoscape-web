// packages/api-types/src/CyWebApi.ts
//
// Re-exports API type shapes from the authoritative source.
//
// Two distinct types for two distinct contexts:
//
//   CyWebApiType   = window.CyWebApi shape — no `resource` field (window-safe).
//                    Non-React consumers cannot provide React.ComponentType values.
//
//   AppContextApis = AppContext.apis shape — extends CyWebApiType and adds
//                    `resource` (ResourceApi) as a required field. The host
//                    always injects it before calling mount().
//
// Both are intentionally distinct; there is no single canonical API shape.
//
// Domain API fields on CyWebApiType (defined in src/app-api/core/index.ts):
//
//   element: ElementApi         (Phase 1a)
//   network: NetworkApi         (Phase 1b)
//   selection: SelectionApi     (Phase 1c)
//   viewport: ViewportApi       (Phase 1c)
//   table: TableApi             (Phase 1d)
//   visualStyle: VisualStyleApi (Phase 1d)
//   layout: LayoutApi           (Phase 1e)
//   export: ExportApi           (Phase 1e)
//   workspace: WorkspaceApi     (Phase 1f)
//   contextMenu: ContextMenuApi (Phase 1h)
//
// External apps should use feature detection to check for specific
// APIs rather than relying on a version string:
//
// ```typescript
// if (typeof window.CyWebApi?.element?.createNode === 'function') {
//   // element API is available
// }
// ```

export type { CyWebApiType } from '../../../src/app-api/core'
export type { AppContextApis } from '../../../src/app-api/types/AppContext'
