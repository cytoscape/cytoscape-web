// A consumer of the published @cytoscape-web/api-types tarball.
//
// This file is never compiled where it sits. scripts/verify-api-types-consumer.mjs
// copies it outside the repository first, because Node and TypeScript resolution
// walk up the tree: compiled in place, `@cytoscape-web/api-types` resolves to
// packages/api-types/dist via the workspace symlink and the tarball is never
// exercised at all.
//
// Covers both ways the package reaches a consumer:
//   1. ordinary type imports from the package entry point
//   2. the ambient surface — window.CyWebApi, typed window events, and the
//      cyweb/* module declarations, which arrive only through the triple-slash
//      reference that `postbuild` prepends to dist/index.d.ts

import type {
  ApiResult,
  CyWebApiType,
  IdType,
  NodeSpec,
  VisualStyle,
} from '@cytoscape-web/api-types'

// ── 1. Ordinary type imports ──────────────────────────────────────────

// ApiResult is a discriminated union: narrowing on `success` must expose
// `data` on one branch and `error` on the other.
export const unwrap = <T>(result: ApiResult<T>): T | undefined => {
  if (result.success) return result.data
  console.error(result.error.code, result.error.message)
  return undefined
}

export const describeNode = (id: IdType, spec: NodeSpec): string =>
  `${id}:${JSON.stringify(spec.attributes ?? {})}`

// ── 2. The ambient surface ────────────────────────────────────────────

// window.CyWebApi is declared by the package, not by this file.
export const currentApi = (): CyWebApiType | undefined => window.CyWebApi

export const readNetworks = async (): Promise<number> => {
  const api = window.CyWebApi
  if (api === undefined) return 0
  const result = await api.workspace.getNetworks()
  return result.success ? result.data.networks.length : 0
}

// The event map augmentation gives addEventListener a typed detail.
window.addEventListener('network:switched', (event) => {
  const networkId: IdType = event.detail.networkId
  console.log(networkId)
})

window.addEventListener('cywebapi:ready', () => {
  void readNetworks()
})

// ── 3. A cyweb/* module declaration ───────────────────────────────────
// Reachable only via dist/mf-declarations.d.ts, which dist/index.d.ts pulls in
// through its triple-slash reference. If postbuild silently no-ops, this import
// stops resolving and the fixture fails — which is the point.

export const applyStyle = async (
  networkId: IdType,
  style: VisualStyle,
): Promise<boolean> => {
  const { useVisualStyleApi } = await import('cyweb/VisualStyleApi')
  const api = useVisualStyleApi()
  const result = await api.applyVisualStyle(networkId, style)
  return result.success
}
