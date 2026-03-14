// packages/api-types/src/CyWebApi.ts
//
// Re-exports CyWebApiType from the authoritative source.
//
// All domain API fields are defined in src/app-api/core/index.ts:
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
