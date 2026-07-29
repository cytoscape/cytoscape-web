import { describe, expect, it } from 'vitest'

import type { Network } from '../../../models/NetworkModel'
import type { NetworkView } from '../../../models/ViewModel'
import {
  isValidNetworkAndViews,
  NdexSubnetworkFetchError,
} from './subnetworkQueryUtil'

const network = {
  nodes: [{ id: 'n1' }, { id: 'n2' }],
  edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
} as unknown as Network

const viewWith = (
  nodeIds: string[],
  edgeIds: string[],
): NetworkView =>
  ({
    nodeViews: Object.fromEntries(nodeIds.map((id) => [id, { id }])),
    edgeViews: Object.fromEntries(edgeIds.map((id) => [id, { id }])),
  }) as unknown as NetworkView

describe('isValidNetworkAndViews', () => {
  it('accepts views whose node/edge IDs exactly match the network', () => {
    expect(
      isValidNetworkAndViews(network, [viewWith(['n1', 'n2'], ['e1'])]),
    ).toBe(true)
  })

  it('rejects missing or empty view lists', () => {
    expect(
      isValidNetworkAndViews(network, undefined as unknown as NetworkView[]),
    ).toBe(false)
    expect(isValidNetworkAndViews(network, [])).toBe(false)
  })

  it('rejects views with a node/edge count mismatch', () => {
    expect(isValidNetworkAndViews(network, [viewWith(['n1'], ['e1'])])).toBe(
      false,
    )
    expect(
      isValidNetworkAndViews(network, [viewWith(['n1', 'n2'], [])]),
    ).toBe(false)
  })

  it('rejects views whose IDs differ even when counts match', () => {
    expect(
      isValidNetworkAndViews(network, [viewWith(['n1', 'nX'], ['e1'])]),
    ).toBe(false)
  })

  it('rejects when any one of several views is inconsistent', () => {
    expect(
      isValidNetworkAndViews(network, [
        viewWith(['n1', 'n2'], ['e1']),
        viewWith(['n1'], ['e1']),
      ]),
    ).toBe(false)
  })
})

describe('NdexSubnetworkFetchError', () => {
  it('records which fetch method failed and chains the cause', () => {
    const cause = new Error('boom')
    const error = new NdexSubnetworkFetchError('failed', 'interconnect', cause)

    expect(error.name).toBe('NdexSubnetworkFetchError')
    expect(error.fetchMethod).toBe('interconnect')
    expect(error.cause).toBe(cause)
    expect(error).toBeInstanceOf(Error)
  })
})
