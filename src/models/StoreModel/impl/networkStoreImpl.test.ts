import cytoscape from 'cytoscape'

import { IdType } from '../../IdType'
import NetworkFn, { Edge, Network } from '../../NetworkModel'
import { UpdateEventType } from '../NetworkStoreModel'
import {
  add,
  addEdgeToNetwork,
  addEdgesToNetwork,
  addNodeToNetwork,
  addNodesAndEdgesToNetwork,
  addNodesToNetwork,
  createDeleteEdgesEvent,
  createDeleteNodesEvent,
  deleteAll,
  deleteEdgesFromNetwork,
  deleteNetwork,
  deleteNodesFromNetwork,
  extractDeletedEdges,
  NetworkStoreState,
  setNetwork,
} from './networkStoreImpl'

const createDefaultState = (): NetworkStoreState => {
  return {
    networks: new Map<IdType, Network>(),
  }
}

const createTestNetwork = (id: IdType): Network => {
  return NetworkFn.createNetworkFromLists(
    id,
    [{ id: 'n1' }, { id: 'n2' }],
    [{ id: 'e1', s: 'n1', t: 'n2' }],
  )
}

describe('NetworkStoreImpl', () => {
  describe('setNetwork', () => {
    it('should set a network in the store', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)

      const result = setNetwork(state, networkId, network)

      expect(result.networks.get(networkId)).toEqual(network)
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('add', () => {
    it('should add a network to the store', () => {
      const state = createDefaultState()
      const network = createTestNetwork('network-1')

      const result = add(state, network)

      expect(result.networks.get(network.id)).toEqual(network)
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('deleteNetwork', () => {
    it('should delete a network from the store', () => {
      const state = createDefaultState()
      const network = createTestNetwork('network-1')

      let result = add(state, network)
      result = deleteNetwork(result, network.id)

      expect(result.networks.get(network.id)).toBeUndefined()
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('deleteAll', () => {
    it('should delete all networks from the store', () => {
      const state = createDefaultState()
      const network1 = createTestNetwork('network-1')
      const network2 = createTestNetwork('network-2')

      let result = add(state, network1)
      result = add(result, network2)
      result = deleteAll(result)

      expect(result.networks.size).toBe(0)
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('extractDeletedEdges', () => {
    it('should extract edge information from deleted elements', () => {
      const network = createTestNetwork('network-1')
      const deletedElements = NetworkFn.deleteNodes(network, ['n1'])

      const edges = extractDeletedEdges(deletedElements)

      expect(edges.length).toBeGreaterThan(0)
      expect(edges[0]).toHaveProperty('id')
      expect(edges[0]).toHaveProperty('s')
      expect(edges[0]).toHaveProperty('t')
    })
  })

  describe('createDeleteNodesEvent', () => {
    it('should create a delete nodes event', () => {
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)
      const deletedElements = NetworkFn.deleteNodes(network, ['n1'])

      const event = createDeleteNodesEvent(networkId, deletedElements)

      expect(event.networkId).toBe(networkId)
      expect(event.type).toBe(UpdateEventType.DELETE)
      expect(event.payload).toBeDefined()
      expect(event.payload.length).toBeGreaterThan(0)
    })
  })

  describe('createDeleteEdgesEvent', () => {
    it('should create a delete edges event', () => {
      const networkId: IdType = 'network-1'
      const network = createTestNetwork(networkId)
      const deletedElements = NetworkFn.deleteEdges(network, ['e1'])

      const event = createDeleteEdgesEvent(networkId, deletedElements)

      expect(event.networkId).toBe(networkId)
      expect(event.type).toBe(UpdateEventType.DELETE)
      expect(event.payload).toBeDefined()
      expect(event.payload).toContain('e1')
    })
  })

  describe('addNodeToNetwork', () => {
    it('should add a node to a network', () => {
      const network = createTestNetwork('network-1')

      const result = addNodeToNetwork(network, 'n3')

      expect(result.nodes.find((n) => n.id === 'n3')).toBeDefined()
    })
  })

  describe('addNodesToNetwork', () => {
    it('should add multiple nodes to a network', () => {
      const network = createTestNetwork('network-1')

      const result = addNodesToNetwork(network, ['n3', 'n4'])

      expect(result.nodes.find((n) => n.id === 'n3')).toBeDefined()
      expect(result.nodes.find((n) => n.id === 'n4')).toBeDefined()
    })
  })

  describe('addNodesAndEdgesToNetwork', () => {
    it('should add nodes and edges to a network', () => {
      const network = createTestNetwork('network-1')

      const result = addNodesAndEdgesToNetwork(
        network,
        ['n3', 'n4'],
        [{ id: 'e2', s: 'n3', t: 'n4' }],
      )

      expect(result.nodes.find((n) => n.id === 'n3')).toBeDefined()
      expect(result.edges.find((e) => e.id === 'e2')).toBeDefined()
    })
  })

  describe('deleteNodesFromNetwork', () => {
    it('should delete nodes from a network', () => {
      const network = createTestNetwork('network-1')

      const { deletedElements, updatedNetwork } = deleteNodesFromNetwork(
        network,
        ['n1'],
      )

      expect(updatedNetwork.nodes.find((n) => n.id === 'n1')).toBeUndefined()
      expect(deletedElements).toBeDefined()
    })
  })

  describe('deleteEdgesFromNetwork', () => {
    it('should delete edges from a network', () => {
      const network = createTestNetwork('network-1')

      const { deletedElements, updatedNetwork } = deleteEdgesFromNetwork(
        network,
        ['e1'],
      )

      expect(updatedNetwork.edges.find((e) => e.id === 'e1')).toBeUndefined()
      expect(deletedElements).toBeDefined()
    })
  })

  describe('addEdgeToNetwork', () => {
    it('should add an edge to a network', () => {
      const network = NetworkFn.createNetworkFromLists(
        'network-1',
        [{ id: 'n1' }, { id: 'n2' }],
        [],
      )

      const result = addEdgeToNetwork(network, 'e1', 'n1', 'n2')

      expect(result.edges.find((e) => e.id === 'e1')).toBeDefined()
    })
  })

  describe('addEdgesToNetwork', () => {
    it('should add multiple edges to a network', () => {
      const network = NetworkFn.createNetworkFromLists(
        'network-1',
        [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
        [],
      )

      const result = addEdgesToNetwork(network, [
        { id: 'e1', s: 'n1', t: 'n2' },
        { id: 'e2', s: 'n2', t: 'n3' },
      ])

      expect(result.edges.find((e) => e.id === 'e1')).toBeDefined()
      expect(result.edges.find((e) => e.id === 'e2')).toBeDefined()
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalNetworks = original.networks

      let state = add(original, createTestNetwork('network-1'))
      state = setNetwork(state, 'network-2', createTestNetwork('network-2'))
      state = deleteNetwork(state, 'network-1')
      state = deleteAll(state)

      // Verify original is unchanged
      expect(original.networks).toBe(originalNetworks)
      expect(original.networks.size).toBe(0)
    })
  })
})

