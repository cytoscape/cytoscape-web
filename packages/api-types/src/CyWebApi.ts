// packages/api-types/src/CyWebApi.ts

/**
 * Type of the global `window.CyWebApi` object.
 *
 * This is a Phase 0 stub. Domain API fields are added incrementally
 * as each Phase 1 implementation is completed:
 *
 * | Phase | Fields added                         |
 * |-------|--------------------------------------|
 * | 1a    | `element: ElementApi`                |
 * | 1b    | `network: NetworkApi`                |
 * | 1c    | `selection: SelectionApi`            |
 * |       | `viewport: ViewportApi`              |
 * | 1d    | `table: TableApi`                    |
 * |       | `visualStyle: VisualStyleApi`        |
 * | 1e    | `layout: LayoutApi`                  |
 * |       | `export: ExportApi`                  |
 *
 * External apps should use feature detection to check for specific
 * APIs rather than relying on the version string:
 *
 * ```typescript
 * if (typeof window.CyWebApi?.element?.createNode === 'function') {
 *   // element API is available
 * }
 * ```
 */
export interface CyWebApiType {
  /**
   * Semantic version string of the app API.
   * Reaches '1.0.0' when all Phase 1e APIs are stable.
   */
  readonly version: string

  // element: ElementApi      // Phase 1a
  // network: NetworkApi      // Phase 1b
  // selection: SelectionApi  // Phase 1c
  // viewport: ViewportApi    // Phase 1c
  // table: TableApi          // Phase 1d
  // visualStyle: VisualStyleApi // Phase 1d
  // layout: LayoutApi        // Phase 1e
  // export: ExportApi        // Phase 1e
}
