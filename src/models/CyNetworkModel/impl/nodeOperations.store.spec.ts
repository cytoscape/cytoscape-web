/**
 * Regression tests for node count bookkeeping in the network summary.
 *
 * Unlike `nodeOperations.test.ts`, these exercise the *real* NetworkStore and
 * NetworkSummaryStore. That matters because `Network.nodes` is a live getter
 * over the underlying Cytoscape store and `addNode` mutates that store in
 * place: a mocked `addNode` that leaves topology untouched cannot catch a
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
import {
  createNodesCore,
  deleteNodesCore,
  NodeOperationStoreActions,
} from './nodeOperations'

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
 * Build store actions the way `useCreateNode` does: the `networks` Map is the
 * snapshot a React component captured on its last render, i.e. taken *before*
 * `addNode` runs.
 */
const makeRealStoreActions = (): NodeOperationStoreActions => {
  const networkState = useNetworkStore.getState()
  return {
    deleteNodesFromNetwork: networkState.deleteNodes,
    addNode: networkState.addNode,
    deleteRows: vi.fn(),
    editRows: vi.fn(),
    deleteViewObjects: vi.fn(),
    addNodeView: vi.fn(),
    updateNetworkSummary: useNetworkSummaryStore.getState().update,
    networks: networkState.networks,
    tables: {},
    viewModels: {},
    visualStyles: {},
  }
}

/**
 * Stand-in for a network freshly loaded from NDEx/CX2: topology already
 * populated and a summary whose counts match it.
 */
const seedLoadedNetwork = (): void => {
  const network = NetworkFn.createNetworkFromLists(
    NET_ID,
    [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }],
    [{ id: 'e0', s: 'n0', t: 'n1' }],
  )
  act(() => {
    useNetworkStore.getState().add(network)
    useNetworkSummaryStore.getState().add(NET_ID, makeSummary(3, 1))
  })
}

const realNodeCount = (): number =>
  useNetworkStore.getState().networks.get(NET_ID)?.nodes.length ?? -1

const summaryNodeCount = (): number =>
  useNetworkSummaryStore.getState().summaries[NET_ID].nodeCount

const summaryEdgeCount = (): number =>
  useNetworkSummaryStore.getState().summaries[NET_ID].edgeCount

const createNode = (nodeId: IdType): void => {
  const storeActions = makeRealStoreActions()
  act(() => {
    createNodesCore(
      {
        networkId: NET_ID,
        nodeIds: [nodeId],
        position: [0, 0, 0],
        attributes: {},
      },
      storeActions,
    )
  })
}

describe('createNodesCore summary bookkeeping (real stores)', () => {
  beforeEach(() => {
    act(() => {
      useNetworkStore.setState({ networks: new Map() })
      useNetworkSummaryStore.setState({ summaries: {} })
    })
    seedLoadedNetwork()
  })

  it('does not inflate the count on the FIRST node added to a loaded network', () => {
    createNode('n3')

    expect(realNodeCount()).toBe(4)
    expect(summaryNodeCount()).toBe(4)
  })

  it('stays in sync across repeated single-node creations', () => {
    createNode('n3')
    expect(summaryNodeCount()).toBe(realNodeCount())

    createNode('n4')
    expect(summaryNodeCount()).toBe(realNodeCount())

    createNode('n5')
    expect(realNodeCount()).toBe(6)
    expect(summaryNodeCount()).toBe(6)
  })

  it('counts a multi-node batch exactly once', () => {
    const storeActions = makeRealStoreActions()
    act(() => {
      createNodesCore(
        {
          networkId: NET_ID,
          nodeIds: ['n3', 'n4'],
          position: [0, 0, 0],
          attributes: {},
        },
        storeActions,
      )
    })

    expect(realNodeCount()).toBe(5)
    expect(summaryNodeCount()).toBe(5)
  })

  it('leaves the edge count untouched when nodes are added', () => {
    createNode('n3')

    expect(summaryEdgeCount()).toBe(1)
  })

  it('keeps create/delete round trips consistent', () => {
    createNode('n3')
    expect(summaryNodeCount()).toBe(4)

    const network = useNetworkStore.getState().networks.get(NET_ID)!
    const storeActions = makeRealStoreActions()
    act(() => {
      deleteNodesCore(NET_ID, ['n3'], network, storeActions)
    })

    expect(realNodeCount()).toBe(3)
    expect(summaryNodeCount()).toBe(3)
  })
})
