// src/app-api/core/scopedApi.ts
// Framework-agnostic scoped-network API — zero React imports.
//
// Every method on the network-scoped domains takes `networkId` as its
// first argument. Threading that through every call is the single biggest
// ergonomics tax on the API. `forNetwork(networkId?)` returns a view of
// those domains with the id pre-bound, so callers write
// `api.forNetwork().element.createNode([0, 0])` instead of resolving and
// passing the id on every call.
//
// This is purely additive: the underlying domain objects are unchanged,
// and the scoped view delegates to them.

import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { elementApi, type ElementApi } from './elementApi'
import { exportApi, type ExportApi } from './exportApi'
import { layoutApi, type LayoutApi } from './layoutApi'
import { selectionApi, type SelectionApi } from './selectionApi'
import { tableApi, type TableApi } from './tableApi'
import { viewportApi, type ViewportApi } from './viewportApi'
import { visualStyleApi, type VisualStyleApi } from './visualStyleApi'

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * A function with its leading `networkId` argument removed. Every method
 * on the scoped domains has this shape applied.
 */
type OmitFirstArg<F> = F extends (first: any, ...rest: infer R) => infer Ret
  ? (...args: R) => Ret
  : never

/** A domain with `networkId` pre-bound on every method. */
type Scoped<T> = { [K in keyof T]: OmitFirstArg<T[K]> }

/**
 * The subset of CyWebApi whose every method is network-scoped
 * (`networkId` first), presented with that id already bound. Domains
 * whose methods are not uniformly network-scoped — `network`,
 * `workspace`, `contextMenu` — are intentionally excluded; call those on
 * the top-level `CyWebApi`. `layout` is the one partial case: only its
 * network-scoped `applyLayout` is bound here.
 */
export interface ScopedCyWebApi {
  element: Scoped<ElementApi>
  table: Scoped<TableApi>
  selection: Scoped<SelectionApi>
  viewport: Scoped<ViewportApi>
  visualStyle: Scoped<VisualStyleApi>
  export: Scoped<ExportApi>
  /**
   * Only `applyLayout` is network-scoped and therefore bound here. Read
   * the available algorithms from the top-level `layout.getAvailableLayouts()`.
   */
  layout: { applyLayout: OmitFirstArg<LayoutApi['applyLayout']> }
}

// ── Implementation ─────────────────────────────────────────────────────────

/**
 * Wrap every method of a domain so the bound network id is injected as
 * the first argument. `getNetworkId` is called per invocation, so an
 * unbound (current-network) scope always targets the network active at
 * call time.
 */
function scopeDomain<T extends object>(
  domain: T,
  getNetworkId: () => IdType,
): Scoped<T> {
  const scoped: Record<string, (...args: any[]) => any> = {}
  for (const [key, fn] of Object.entries(domain)) {
    if (typeof fn !== 'function') continue
    scoped[key] = (...args: any[]) => fn(getNetworkId(), ...args)
  }
  return scoped as Scoped<T>
}

/**
 * Return the network-scoped domains with `networkId` pre-bound.
 *
 * @param networkId - Bind a specific network. When omitted, each call
 *   targets the workspace's current network, resolved at call time (an
 *   empty current network surfaces the usual NETWORK_NOT_FOUND from the
 *   underlying method).
 *
 * @example
 * const net = CyWebApi.forNetwork()          // current network
 * net.element.createNode([100, 200])
 * net.selection.exclusiveSelect(['n1'], [])
 *
 * const other = CyWebApi.forNetwork('net-42') // a specific network
 * other.table.getTable('node')
 */
export function forNetwork(networkId?: IdType): ScopedCyWebApi {
  const getNetworkId: () => IdType =
    networkId !== undefined
      ? () => networkId
      : () => useWorkspaceStore.getState().workspace.currentNetworkId

  return {
    element: scopeDomain(elementApi, getNetworkId),
    table: scopeDomain(tableApi, getNetworkId),
    selection: scopeDomain(selectionApi, getNetworkId),
    viewport: scopeDomain(viewportApi, getNetworkId),
    visualStyle: scopeDomain(visualStyleApi, getNetworkId),
    export: scopeDomain(exportApi, getNetworkId),
    // Only applyLayout is network-scoped; bind it alone rather than the
    // whole layout domain (getAvailableLayouts takes no networkId).
    layout: {
      applyLayout: (options) => layoutApi.applyLayout(getNetworkId(), options),
    },
  }
}
