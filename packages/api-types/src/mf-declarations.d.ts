// Hand-maintained ambient module declarations for cyweb/* Module Federation remotes.
//
// No top-level imports — inline import() types are used inside each declare module block.
// This avoids a circular self-reference: this file is loaded as part of the
// @cytoscape-web/api-types package (via /// <reference path> in dist/index.d.ts),
// so importing '@cytoscape-web/api-types' here would be circular.
// Instead, we use relative import('./index') which resolves to dist/index.d.ts.
//
// HOW TO USE (plugin app developers):
//   1. npm install --save-dev @cytoscape-web/api-types
//   2. In tsconfig.json:
//        "typeRoots": ["./node_modules/@types", "./node_modules/@cytoscape-web"]
//   3. Delete remotes.d.ts — no longer needed.
//
// Full IDE assist (hover types, parameter names, completions) is provided for
// all cyweb/* imports without requiring the cytoscape-web host repository.

declare module 'cyweb/WorkspaceApi' {
  export function useWorkspaceApi(): import('./index').WorkspaceApi
}

declare module 'cyweb/VisualStyleApi' {
  export function useVisualStyleApi(): import('./index').VisualStyleApi
}

declare module 'cyweb/SelectionApi' {
  export function useSelectionApi(): import('./index').SelectionApi
}

declare module 'cyweb/LayoutApi' {
  export function useLayoutApi(): import('./index').LayoutApi
}

declare module 'cyweb/ElementApi' {
  export function useElementApi(): import('./index').ElementApi
}

declare module 'cyweb/NetworkApi' {
  export function useNetworkApi(): import('./index').NetworkApi
}

declare module 'cyweb/TableApi' {
  export function useTableApi(): import('./index').TableApi
}

declare module 'cyweb/ViewportApi' {
  export function useViewportApi(): import('./index').ViewportApi
}

declare module 'cyweb/ExportApi' {
  export function useExportApi(): import('./index').ExportApi
}

declare module 'cyweb/EventBus' {
  export function useCyWebEvent<K extends keyof import('./index').CyWebEvents>(
    eventType: K,
    handler: (detail: import('./index').CyWebEvents[K]) => void,
  ): void
}

// cyweb/ContextMenuApi removed in Phase 2 — context menu access is now via
// AppContext.apis.contextMenu (per-app factory) or window.CyWebApi.contextMenu.

declare module 'cyweb/AppIdContext' {
  export function useAppContext(): {
    readonly appId: string
    readonly apis: import('./index').AppContextApis
  } | null
  export const AppIdProvider: import('react').Provider<{
    readonly appId: string
    readonly apis: import('./index').AppContextApis
  } | null>
}

declare module 'cyweb/ApiTypes' {
  export * from '@cytoscape-web/api-types'
}
