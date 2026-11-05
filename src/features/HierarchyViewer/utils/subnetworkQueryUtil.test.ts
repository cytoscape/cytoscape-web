// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchNdexInterconnectQuery,
  fetchNdexNetwork,
} from '../../../data/external-api/ndex'
import type { Network } from '../../../models/NetworkModel'
import type { NetworkView } from '../../../models/ViewModel'
import { SubsystemTag } from '../model/HcxMetaTag'
import {
  clearPrefetchedSubnetworks,
  fetchNdexSubnetworkByQuery,
  getSubNetworkId,
  isValidNetworkAndViews,
  NdexSubnetworkFetchError,
  prefetchSubnetworkCx2,
  subsystemRequest,
} from './subnetworkQueryUtil'

vi.mock('../../../data/external-api/ndex', () => ({
  fetchNdexNetwork: vi.fn(),
  fetchNdexInterconnectQuery: vi.fn(),
}))
vi.mock('../../../models/CxModel/impl', () => ({
  getCyNetworkFromCx2: (id: string) => ({
    network: { id, nodes: [], edges: [] },
    networkViews: [{ nodeViews: {}, edgeViews: {} }],
  }),
}))

const network = {
  nodes: [{ id: 'n1' }, { id: 'n2' }],
  edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
} as unknown as Network

const viewWith = (nodeIds: string[], edgeIds: string[]): NetworkView =>
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
    expect(isValidNetworkAndViews(network, [viewWith(['n1', 'n2'], [])])).toBe(
      false,
    )
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

describe('getSubNetworkId', () => {
  it('joins the hierarchy ID and the subsystem node ID', () => {
    expect(getSubNetworkId('hier-uuid', '42')).toBe('hier-uuid_42')
  })
})

describe('subsystemRequest', () => {
  const metadata = {
    interactionNetworkUUID: 'root',
    interactionNetworkHost: 'idekerlab.ndexbio.org',
    modelFileCount: 0,
  }

  it('fetches the interaction network the row names', () => {
    expect(
      subsystemRequest(
        {
          [SubsystemTag.interactionNetworkUuid]: 'own',
          [SubsystemTag.members]: [1, 2],
        },
        metadata,
        'dev1.ndexbio.org',
      ),
    ).toEqual({
      interactionNetworkUuid: 'own',
      rootNetworkUuid: 'root',
      query: '1,2',
      ndexUrl: 'idekerlab.ndexbio.org',
    })
  })

  it('queries the members on the configured server when the hierarchy names none', () => {
    expect(
      subsystemRequest(
        { [SubsystemTag.members]: [3, 4] },
        { ...metadata, interactionNetworkHost: undefined },
        'dev1.ndexbio.org',
      ),
    ).toEqual({
      interactionNetworkUuid: '',
      rootNetworkUuid: 'root',
      query: '3,4',
      ndexUrl: 'dev1.ndexbio.org',
    })
  })

  it('gives nothing for a row with neither, or no row', () => {
    expect(subsystemRequest({}, metadata, 'x')).toBeUndefined()
    expect(subsystemRequest(undefined, metadata, 'x')).toBeUndefined()
    expect(
      subsystemRequest({ [SubsystemTag.members]: [1] }, undefined, 'x'),
    ).toBeUndefined()
  })
})

describe('prefetchSubnetworkCx2', () => {
  const request = {
    interactionNetworkUuid: '',
    rootNetworkUuid: 'root',
    query: '1,2',
    ndexUrl: 'host',
  }
  // hierarchyId, host, root, subsystemId, query, uuid, token
  const click = (): Promise<unknown> =>
    fetchNdexSubnetworkByQuery(['h', 'host', 'root', 's1', '1,2', '', 'token'])

  beforeEach(() => {
    clearPrefetchedSubnetworks()
    vi.mocked(fetchNdexInterconnectQuery).mockReset()
    vi.mocked(fetchNdexNetwork).mockReset()
  })

  it('lets a click reuse the download a hover started', async () => {
    vi.mocked(fetchNdexInterconnectQuery).mockResolvedValue({} as any)

    prefetchSubnetworkCx2(request, 'token')
    prefetchSubnetworkCx2(request, 'token')
    await click()

    expect(fetchNdexInterconnectQuery).toHaveBeenCalledTimes(1)
    expect(fetchNdexInterconnectQuery).toHaveBeenCalledWith(
      'root',
      '1,2',
      'token',
      'host',
    )
  })

  it('downloads again on click when the prefetch failed', async () => {
    vi.mocked(fetchNdexInterconnectQuery)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({} as any)

    prefetchSubnetworkCx2(request)
    await click()

    expect(fetchNdexInterconnectQuery).toHaveBeenCalledTimes(2)
  })

  it('uses each prefetched download once', async () => {
    vi.mocked(fetchNdexInterconnectQuery).mockResolvedValue({} as any)

    prefetchSubnetworkCx2(request)
    await click()
    await click()

    expect(fetchNdexInterconnectQuery).toHaveBeenCalledTimes(2)
  })
})
