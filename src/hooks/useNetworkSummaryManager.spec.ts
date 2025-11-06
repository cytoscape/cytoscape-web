import { act, renderHook } from '@testing-library/react'

import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { UpdateEventType } from '../models/StoreModel/NetworkStoreModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useNetworkSummaryManager } from './useNetworkSummaryManager'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../db', () => ({
  ...jest.requireActual('../db'),
  putNetworkToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworksFromDb: jest.fn().mockResolvedValue(undefined),
  putNetworkSummaryToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock the workspace store to provide a current network ID
jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
      },
    })),
  },
}))

describe('useNetworkSummaryManager', () => {
  const createTestNetwork = (id: IdType, nodeCount: number, edgeCount: number): Network => {
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      id: `n${i + 1}`,
    }))
    const edges = Array.from({ length: edgeCount }, (_, i) => ({
      id: `e${i + 1}`,
      s: `n${(i % nodeCount) + 1}`,
      t: `n${((i + 1) % nodeCount) + 1}`,
    }))
    return NetworkFn.createNetworkFromLists(id, nodes, edges)
  }

  beforeEach(() => {
    // Reset stores to initial state before each test
    const networkStore = renderHook(() => useNetworkStore())
    const summaryStore = renderHook(() => useNetworkSummaryStore())
    act(() => {
      networkStore.result.current.deleteAll()
      summaryStore.result.current.deleteAll()
    })
  })

  it('should update network summary when network is deleted', () => {
    const networkId: IdType = 'network-1'
    const network = createTestNetwork(networkId, 5, 10)

    // Set up network store
    const { result: networkStoreResult } = renderHook(() => useNetworkStore())
    act(() => {
      networkStoreResult.current.add(network)
    })

    // Set up summary store
    const { result: summaryStoreResult } = renderHook(() =>
      useNetworkSummaryStore(),
    )
    act(() => {
      summaryStoreResult.current.add(networkId, {
        externalId: networkId,
        name: 'Test Network',
        nodeCount: 0,
        edgeCount: 0,
        isNdex: false,
        ownerUUID: 'owner-1',
        isReadOnly: false,
        subnetworkIds: [],
        isValid: true,
        warnings: [],
        isShowcase: false,
        isCertified: false,
        indexLevel: 'all',
        hasLayout: false,
        hasSample: false,
        cxFileSize: 0,
        cx2FileSize: 0,
        properties: [],
        owner: 'owner',
        version: '1.0',
        completed: true,
        visibility: 'PUBLIC',
        description: 'Test network',
        creationTime: new Date(),
        isDeleted: false,
        modificationTime: new Date(),
      })
    })

    // Render the manager hook
    renderHook(() => useNetworkSummaryManager())

    // Trigger a delete event
    act(() => {
      networkStoreResult.current.delete(networkId, [])
    })

    // Wait for the effect to run and check the summary was updated
    const updatedSummary = summaryStoreResult.current.summaries.get(networkId)
    expect(updatedSummary).toBeDefined()
    expect(updatedSummary?.nodeCount).toBe(5)
    expect(updatedSummary?.edgeCount).toBe(10)
  })

  it('should not update summary when network is not found', () => {
    const networkId: IdType = 'network-1'

    // Set up summary store
    const { result: summaryStoreResult } = renderHook(() =>
      useNetworkSummaryStore(),
    )
    act(() => {
      summaryStoreResult.current.add(networkId, {
        externalId: networkId,
        name: 'Test Network',
        nodeCount: 0,
        edgeCount: 0,
        isNdex: false,
        ownerUUID: 'owner-1',
        isReadOnly: false,
        subnetworkIds: [],
        isValid: true,
        warnings: [],
        isShowcase: false,
        isCertified: false,
        indexLevel: 'all',
        hasLayout: false,
        hasSample: false,
        cxFileSize: 0,
        cx2FileSize: 0,
        properties: [],
        owner: 'owner',
        version: '1.0',
        completed: true,
        visibility: 'PUBLIC',
        description: 'Test network',
        creationTime: new Date(),
        isDeleted: false,
        modificationTime: new Date(),
      })
    })

    const initialSummary = summaryStoreResult.current.summaries.get(networkId)

    // Set up network store (without adding the network)
    const { result: networkStoreResult } = renderHook(() => useNetworkStore())

    // Render the manager hook
    renderHook(() => useNetworkSummaryManager())

    // Trigger a delete event for a network that doesn't exist
    act(() => {
      networkStoreResult.current.delete(networkId, [])
    })

    // Summary should remain unchanged
    const updatedSummary = summaryStoreResult.current.summaries.get(networkId)
    expect(updatedSummary).toEqual(initialSummary)
  })

  it('should not update summary for non-DELETE events', () => {
    const networkId: IdType = 'network-1'
    const network = createTestNetwork(networkId, 3, 5)

    // Set up stores
    const { result: networkStoreResult } = renderHook(() => useNetworkStore())
    const { result: summaryStoreResult } = renderHook(() =>
      useNetworkSummaryStore(),
    )

    act(() => {
      networkStoreResult.current.add(network)
      summaryStoreResult.current.add(networkId, {
        externalId: networkId,
        name: 'Test Network',
        nodeCount: 0,
        edgeCount: 0,
        isNdex: false,
        ownerUUID: 'owner-1',
        isReadOnly: false,
        subnetworkIds: [],
        isValid: true,
        warnings: [],
        isShowcase: false,
        isCertified: false,
        indexLevel: 'all',
        hasLayout: false,
        hasSample: false,
        cxFileSize: 0,
        cx2FileSize: 0,
        properties: [],
        owner: 'owner',
        version: '1.0',
        completed: true,
        visibility: 'PUBLIC',
        description: 'Test network',
        creationTime: new Date(),
        isDeleted: false,
        modificationTime: new Date(),
      })
    })

    const initialSummary = summaryStoreResult.current.summaries.get(networkId)

    // Render the manager hook
    renderHook(() => useNetworkSummaryManager())

    // Trigger an ADD event (not DELETE)
    act(() => {
      networkStoreResult.current.add(network)
    })

    // Summary should remain unchanged
    const updatedSummary = summaryStoreResult.current.summaries.get(networkId)
    expect(updatedSummary).toEqual(initialSummary)
  })

  it('should handle multiple delete events', () => {
    const networkId1: IdType = 'network-1'
    const networkId2: IdType = 'network-2'
    const network1 = createTestNetwork(networkId1, 2, 3)
    const network2 = createTestNetwork(networkId2, 4, 6)

    // Set up stores
    const { result: networkStoreResult } = renderHook(() => useNetworkStore())
    const { result: summaryStoreResult } = renderHook(() =>
      useNetworkSummaryStore(),
    )

    act(() => {
      networkStoreResult.current.add(network1)
      networkStoreResult.current.add(network2)
      summaryStoreResult.current.add(networkId1, {
        externalId: networkId1,
        name: 'Network 1',
        nodeCount: 0,
        edgeCount: 0,
        isNdex: false,
        ownerUUID: 'owner-1',
        isReadOnly: false,
        subnetworkIds: [],
        isValid: true,
        warnings: [],
        isShowcase: false,
        isCertified: false,
        indexLevel: 'all',
        hasLayout: false,
        hasSample: false,
        cxFileSize: 0,
        cx2FileSize: 0,
        properties: [],
        owner: 'owner',
        version: '1.0',
        completed: true,
        visibility: 'PUBLIC',
        description: 'Test network',
        creationTime: new Date(),
        isDeleted: false,
        modificationTime: new Date(),
      })
      summaryStoreResult.current.add(networkId2, {
        externalId: networkId2,
        name: 'Network 2',
        nodeCount: 0,
        edgeCount: 0,
        isNdex: false,
        ownerUUID: 'owner-1',
        isReadOnly: false,
        subnetworkIds: [],
        isValid: true,
        warnings: [],
        isShowcase: false,
        isCertified: false,
        indexLevel: 'all',
        hasLayout: false,
        hasSample: false,
        cxFileSize: 0,
        cx2FileSize: 0,
        properties: [],
        owner: 'owner',
        version: '1.0',
        completed: true,
        visibility: 'PUBLIC',
        description: 'Test network',
        creationTime: new Date(),
        isDeleted: false,
        modificationTime: new Date(),
      })
    })

    // Render the manager hook
    renderHook(() => useNetworkSummaryManager())

    // Trigger delete events
    act(() => {
      networkStoreResult.current.delete(networkId1, [])
      networkStoreResult.current.delete(networkId2, [])
    })

    // Check both summaries were updated
    const summary1 = summaryStoreResult.current.summaries.get(networkId1)
    const summary2 = summaryStoreResult.current.summaries.get(networkId2)

    expect(summary1?.nodeCount).toBe(2)
    expect(summary1?.edgeCount).toBe(3)
    expect(summary2?.nodeCount).toBe(4)
    expect(summary2?.edgeCount).toBe(6)
  })

  it('should not update when lastUpdated is undefined', () => {
    const networkId: IdType = 'network-1'

    // Set up summary store
    const { result: summaryStoreResult } = renderHook(() =>
      useNetworkSummaryStore(),
    )
    act(() => {
      summaryStoreResult.current.add(networkId, {
        externalId: networkId,
        name: 'Test Network',
        nodeCount: 0,
        edgeCount: 0,
        isNdex: false,
        ownerUUID: 'owner-1',
        isReadOnly: false,
        subnetworkIds: [],
        isValid: true,
        warnings: [],
        isShowcase: false,
        isCertified: false,
        indexLevel: 'all',
        hasLayout: false,
        hasSample: false,
        cxFileSize: 0,
        cx2FileSize: 0,
        properties: [],
        owner: 'owner',
        version: '1.0',
        completed: true,
        visibility: 'PUBLIC',
        description: 'Test network',
        creationTime: new Date(),
        isDeleted: false,
        modificationTime: new Date(),
      })
    })

    const initialSummary = summaryStoreResult.current.summaries.get(networkId)

    // Render the manager hook
    renderHook(() => useNetworkSummaryManager())

    // Summary should remain unchanged when lastUpdated is undefined
    const updatedSummary = summaryStoreResult.current.summaries.get(networkId)
    expect(updatedSummary).toEqual(initialSummary)
  })
})

