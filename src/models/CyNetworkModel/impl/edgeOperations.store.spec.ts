/**
 * Regression tests for edge count bookkeeping in the network summary.
 *
 * Unlike `edgeOperations.test.ts`, these exercise the *real* NetworkStore and
 * NetworkSummaryStore. That matters because `Network.edges` is a live getter
 * over the underlying Cytoscape store and `addEdge` mutates that store in
 * place: a mocked `addEdge` that leaves topology untouched cannot catch a
 * double-count in the summary arithmetic.
 */
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { IdType } from '../../IdType'
import NetworkFn from '../../NetworkModel'
import { NetworkSummary } from '../../NetworkSummaryModel'
import { Visibility } from '../../NetworkSummaryModel/Visibility'
import { createEdgesCore, EdgeOperationStoreActions } from './edgeOperations'

vi.mock('../../../data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data/db')>()
  return {
    ...actual,
    putNetworkToDb: vi.fn().mockResolvedValue(undefined),
    putNetworkSummaryToDb: vi.fn().mockResolvedValue(undefined),
    deleteNetworkFromDb: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({ workspace: { currentNetworkId: NET_ID } })),
  },
}))

const NET_ID = 'net-1'

const makeSummary = (nodeCount: number, edgeCount: number): NetworkSummary =>
  ({
    name: 'test network',
    externalId: NET_ID,
    nodeCount,
    edgeCount,
    description: '',
    owner: '',
    version: '',
    completed: true,
    visibility: Visibility.PRIVATE,
    properties: [],
    isNdex: false,
    ownerUUID: '',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: true,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: '',
    hasLayout: false,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    isDeleted: false,
    creationTime: new Date(0),
    modificationTime: new Date(0),
  }) as NetworkSummary

/**
 * Build store actions the way `useCreateEdge` does: the `networks` Map is the
 * snapshot a React component captured on its last render, i.e. taken *before*
 * `addEdge` runs.
 */
const makeRealStoreActions = (): EdgeOperationStoreActions => {
  const networkState = useNetworkStore.getState()
  return {
    deleteEdgesFromNetwork: networkState.deleteEdges,
    addEdge: networkState.addEdge,
    deleteRows: vi.fn(),
    editRows: vi.fn(),
    deleteViewObjects: vi.fn(),
    addEdgeView: vi.fn(),
    updateNetworkSummary: useNetworkSummaryStore.getState().update,
    networks: networkState.networks,
    tables: {},
    viewModels: {},
    visualStyles: {},
  }
}

const seedTwoNodesOneEdge = (): void => {
  const network = NetworkFn.createNetworkFromLists(
    NET_ID,
    [{ id: 'n0' }, { id: 'n1' }],
    [{ id: 'e0', s: 'n0', t: 'n1' }],
  )
  act(() => {
    useNetworkStore.getState().add(network)
    useNetworkSummaryStore.getState().add(NET_ID, makeSummary(2, 1))
  })
}

const trueEdgeCount = (): number =>
  useNetworkStore.getState().networks.get(NET_ID)?.edges.length ?? -1

const summaryEdgeCount = (): number =>
  useNetworkSummaryStore.getState().summaries[NET_ID].edgeCount

const createEdge = (edgeId: IdType, sourceId: IdType, targetId: IdType): void => {
  const storeActions = makeRealStoreActions()
  act(() => {
    createEdgesCore(
      { networkId: NET_ID, edgeIds: [edgeId], sourceId, targetId, attributes: {} },
      storeActions,
    )
  })
}

describe('createEdgesCore summary bookkeeping (real stores)', () => {
  beforeEach(() => {
    act(() => {
      useNetworkStore.setState({ networks: new Map() })
      useNetworkSummaryStore.setState({ summaries: {} })
    })
    seedTwoNodesOneEdge()
  })

  it('keeps the summary edge count equal to the real topology after one edge', () => {
    createEdge('e1', 'n0', 'n1')

    expect(trueEdgeCount()).toBe(2)
    expect(summaryEdgeCount()).toBe(2)
  })

  it('keeps the summary edge count equal to the real topology for a self-loop', () => {
    createEdge('e1', 'n0', 'n0')

    expect(trueEdgeCount()).toBe(2)
    expect(summaryEdgeCount()).toBe(2)
  })

  it('stays in sync across repeated single-edge creations', () => {
    createEdge('e1', 'n0', 'n1')
    createEdge('e2', 'n1', 'n0')
    createEdge('e3', 'n0', 'n1')

    expect(trueEdgeCount()).toBe(4)
    expect(summaryEdgeCount()).toBe(4)
  })

  it('keeps the node count unchanged when edges are added', () => {
    createEdge('e1', 'n0', 'n1')

    expect(useNetworkSummaryStore.getState().summaries[NET_ID].nodeCount).toBe(2)
  })

  it('counts a multi-edge batch exactly once', () => {
    const storeActions = makeRealStoreActions()
    act(() => {
      createEdgesCore(
        {
          networkId: NET_ID,
          edgeIds: ['e1', 'e2'],
          sourceId: 'n0',
          targetId: 'n1',
          attributes: {},
        },
        storeActions,
      )
    })

    expect(trueEdgeCount()).toBe(3)
    expect(summaryEdgeCount()).toBe(3)
  })
})
