import { act, renderHook } from '@testing-library/react'

import { IdType } from '../../../models/IdType'
import NetworkFn, { Edge, Network } from '../../../models/NetworkModel'
import {
  NetworkUpdatedEvent,
  UpdateEventType,
} from '../../../models/StoreModel/NetworkStoreModel'
import { useNetworkStore } from './NetworkStore'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../../db', () => ({
  ...jest.requireActual('../../db'),
  putNetworkToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworksFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock the workspace store to provide a current network ID
jest.mock('./WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
      },
    })),
  },
}))

describe('useNetworkStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useNetworkStore())
    act(() => {
      result.current.deleteAll()
    })
  })

  const createTestNetwork = (id: IdType): Network => {
    return NetworkFn.createNetworkFromLists(
      id,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
  }

  describe('setNetwork', () => {
    it('should set a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.setNetwork(networkId, network)
      })

      expect(result.current.networks.get(networkId)).toEqual(network)
    })
  })

  describe('add', () => {
    it('should add a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const network = createTestNetwork('network-1')

      act(() => {
        result.current.add(network)
      })

      expect(result.current.networks.get(network.id)).toEqual(network)
    })

    it('should handle multiple networks', () => {
      const { result } = renderHook(() => useNetworkStore())
      const network1 = createTestNetwork('network-1')
      const network2 = createTestNetwork('network-2')

      act(() => {
        result.current.add(network1)
        result.current.add(network2)
      })

      expect(result.current.networks.get('network-1')).toEqual(network1)
      expect(result.current.networks.get('network-2')).toEqual(network2)
    })
  })

  describe('addNode', () => {
    it('should add a node to a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
        result.current.addNode(networkId, 'n3')
      })

      const updatedNetwork = result.current.networks.get(networkId)
      expect(updatedNetwork?.nodes.find((n) => n.id === 'n3')).toBeDefined()
    })

    it('should handle non-existent network gracefully', () => {
      const { result } = renderHook(() => useNetworkStore())

      act(() => {
        result.current.addNode('non-existent', 'n1')
      })

      // Should not throw
      expect(result.current.networks.get('non-existent')).toBeUndefined()
    })
  })

  describe('addNodes', () => {
    it('should add multiple nodes to a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
        result.current.addNodes(networkId, ['n3', 'n4'])
      })

      const updatedNetwork = result.current.networks.get(networkId)
      expect(updatedNetwork?.nodes.find((n) => n.id === 'n3')).toBeDefined()
      expect(updatedNetwork?.nodes.find((n) => n.id === 'n4')).toBeDefined()
    })
  })

  describe('addNodesAndEdges', () => {
    it('should add nodes and edges to a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
        result.current.addNodesAndEdges(
          networkId,
          ['n3', 'n4'],
          [{ id: 'e2', s: 'n3', t: 'n4' }],
        )
      })

      const updatedNetwork = result.current.networks.get(networkId)
      expect(updatedNetwork?.nodes.find((n) => n.id === 'n3')).toBeDefined()
      expect(updatedNetwork?.edges.find((e) => e.id === 'e2')).toBeDefined()
    })
  })

  describe('deleteNodes', () => {
    it('should delete nodes from a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
      })

      let deletedEdges: Edge[] = []
      act(() => {
        deletedEdges = result.current.deleteNodes(networkId, ['n1'])
      })

      const updatedNetwork = result.current.networks.get(networkId)
      expect(updatedNetwork?.nodes.find((n) => n.id === 'n1')).toBeUndefined()
      expect(result.current.lastUpdated).toBeDefined()
      expect(result.current.lastUpdated?.type).toBe(UpdateEventType.DELETE)
    })

    it('should return deleted connecting edges', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
      })

      let deletedEdges: Edge[] = []
      act(() => {
        deletedEdges = result.current.deleteNodes(networkId, ['n1'])
      })

      expect(deletedEdges.length).toBeGreaterThan(0)
      expect(deletedEdges[0].id).toBe('e1')
    })

    it('should handle empty nodeIds array', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
      })

      let deletedEdges: Edge[] = []
      act(() => {
        deletedEdges = result.current.deleteNodes(networkId, [])
      })

      expect(deletedEdges).toEqual([])
    })
  })

  describe('deleteEdges', () => {
    it('should delete edges from a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
        result.current.deleteEdges(networkId, ['e1'])
      })

      const updatedNetwork = result.current.networks.get(networkId)
      expect(updatedNetwork?.edges.find((e) => e.id === 'e1')).toBeUndefined()
      expect(result.current.lastUpdated).toBeDefined()
      expect(result.current.lastUpdated?.type).toBe(UpdateEventType.DELETE)
    })

    it('should handle empty edgeIds array', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
        result.current.deleteEdges(networkId, [])
      })

      // Should not throw
      expect(result.current.networks.get(networkId)).toBeDefined()
    })
  })

  describe('addEdge', () => {
    it('should add an edge to a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
        result.current.addEdge(networkId, 'e2', 'n1', 'n2')
      })

      const updatedNetwork = result.current.networks.get(networkId)
      expect(updatedNetwork?.edges.find((e) => e.id === 'e2')).toBeDefined()
    })
  })

  describe('addEdges', () => {
    it('should add multiple edges to a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = NetworkFn.createNetworkFromLists(
        networkId,
        [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
        [],
      )

      act(() => {
        result.current.add(network)
        result.current.addEdges(networkId, [
          { id: 'e1', s: 'n1', t: 'n2' },
          { id: 'e2', s: 'n2', t: 'n3' },
        ])
      })

      const updatedNetwork = result.current.networks.get(networkId)
      expect(updatedNetwork?.edges.find((e) => e.id === 'e1')).toBeDefined()
      expect(updatedNetwork?.edges.find((e) => e.id === 'e2')).toBeDefined()
    })
  })

  describe('delete', () => {
    it('should delete a network', () => {
      const { result } = renderHook(() => useNetworkStore())
      const network = createTestNetwork('network-1')

      act(() => {
        result.current.add(network)
        result.current.delete(network.id)
      })

      expect(result.current.networks.get(network.id)).toBeUndefined()
    })

    it('should not affect other networks', () => {
      const { result } = renderHook(() => useNetworkStore())
      const network1 = createTestNetwork('network-1')
      const network2 = createTestNetwork('network-2')

      act(() => {
        result.current.add(network1)
        result.current.add(network2)
        result.current.delete(network1.id)
      })

      expect(result.current.networks.get(network1.id)).toBeUndefined()
      expect(result.current.networks.get(network2.id)).toEqual(network2)
    })
  })

  describe('deleteAll', () => {
    it('should delete all networks', () => {
      const { result } = renderHook(() => useNetworkStore())
      const network1 = createTestNetwork('network-1')
      const network2 = createTestNetwork('network-2')

      act(() => {
        result.current.add(network1)
        result.current.add(network2)
        result.current.deleteAll()
      })

      expect(result.current.networks.size).toBe(0)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: add, modify, delete', () => {
      const { result } = renderHook(() => useNetworkStore())
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      act(() => {
        result.current.add(network)
      })
      expect(result.current.networks.get(networkId)).toEqual(network)

      act(() => {
        result.current.addNode(networkId, 'n3')
        result.current.addEdge(networkId, 'e2', 'n2', 'n3')
      })

      const updatedNetwork = result.current.networks.get(networkId)
      expect(updatedNetwork?.nodes.find((n) => n.id === 'n3')).toBeDefined()
      expect(updatedNetwork?.edges.find((e) => e.id === 'e2')).toBeDefined()

      act(() => {
        result.current.delete(networkId)
      })
      expect(result.current.networks.get(networkId)).toBeUndefined()
    })
  })
})

