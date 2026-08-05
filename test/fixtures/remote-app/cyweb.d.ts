// Fixture-local ambient declarations for the `cyweb/*` remote modules this
// fixture consumes.
//
// Deliberately NOT `/// <reference types="@cytoscape-web/api-types" />`. That
// package's `types` field points at `dist/index.d.ts` and `dist/` is
// gitignored, so on a fresh checkout (and in clean CI) nothing there exists
// until `npm run build:api-types` has run — a build-order dependency for
// `lint:tsc`. Referencing the package's tracked source instead would load the
// same ambient `declare module 'cyweb/*'` blocks twice wherever `dist/` also
// exists, which only breaks on developer machines.
//
// So: a test double gets exactly the surface it calls. It must MATCH the real
// API, not approximate it — `ApiResult` is a discriminated union (not
// `success: boolean` with an optional `data`) and the field is `workspaceId`
// (not `id`). Getting either wrong still compiles; the fixture would then
// render `undefined` and the E2E would assert on an empty string and pass.
// Source of truth: src/app-api/core/workspaceApi.ts, src/app-api/types/ApiResult.ts

declare module 'cyweb/WorkspaceApi' {
  export interface WorkspaceInfo {
    readonly workspaceId: string
    readonly name: string
    readonly currentNetworkId: string
    readonly networkCount: number
  }

  export interface ApiError {
    readonly code: string
    readonly severity: 'error' | 'warning'
    readonly message: string
  }

  export type ApiResult<T> =
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly error: ApiError }

  export function useWorkspaceApi(): {
    getWorkspaceInfo: () => ApiResult<WorkspaceInfo>
  }
}
