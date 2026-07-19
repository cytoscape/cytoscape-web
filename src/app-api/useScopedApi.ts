// src/app-api/useScopedApi.ts
// Exposed as cyweb/ScopedApi
//
// React wrapper around core forNetwork(): returns the network-scoped
// domains with networkId pre-bound. The scoped view is memoized per
// networkId so it is stable across renders (safe in effect/callback deps).

import { useMemo } from 'react'

import { forNetwork } from './core/scopedApi'
import type { ScopedCyWebApi } from './core/scopedApi'

export type { ScopedCyWebApi }

/**
 * Returns the network-scoped API (element, table, selection, viewport,
 * visualStyle, export) with `networkId` pre-bound. Pass a specific id, or
 * omit it to target the workspace's current network, resolved at call time.
 *
 * @example
 * const net = useScopedApi()          // current network
 * net.element.createNode([100, 200])
 *
 * const other = useScopedApi(networkId)
 * other.table.getTable('node')
 */
export const useScopedApi = (networkId?: string): ScopedCyWebApi =>
  useMemo(() => forNetwork(networkId), [networkId])
