import { IdType } from '../models/IdType'
import NetworkFn, { Edge, Network } from '../models/NetworkModel'
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  clearNetworksFromDb,
  deleteNetworkFromDb,
  putNetworkToDb,
} from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'

export const UpdateEventType = {
  ADD: 'ADD',
  DELETE: 'DELETE',
} as const

type UpdateEventType = (typeof UpdateEventType)[keyof typeof UpdateEventType]

export interface NetworkUpdatedEvent {
  networkId: IdType // Last modified network ID
  type: UpdateEventType // Type of modification, add or delete
  payload: IdType[] // List of node/edge IDs updated
}

interface NetworkState {
  networks: Map<IdType, Network>
  // Wil be set by this store when a network topology is updated
  lastUpdated?: NetworkUpdatedEvent
}

/**
 * Actions to mutate (update) network topology
 */
interface UpdateActions {
  // Add node(s) to a network
  addNode: (networkId: IdType, nodeId: IdType) => void
  addNodes: (networkId: IdType, nodeIds: IdType[]) => void

  // Add edge(s) to a network
  addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => void
  addEdges: (networkId: IdType, edges: Edge[]) => void

  // Delete nodes and edges from a network
  deleteNodes: (networkId: IdType, nodeIds: IdType[]) => void
  deleteEdges: (networkId: IdType, edgeIds: IdType[]) => void
}

/**
 * Actions to add/delete networks from the store
 */
interface NetworkActions {
  // Add a new network
  add: (network: Network) => void

  // Delete a network
  delete: (networkId: IdType) => void

  // Delete all networks from the store
  deleteAll: () => void
}

type NetworkStore = NetworkState & NetworkActions & UpdateActions

const persist =
  (config: StateCreator<NetworkStore>) =>
  (
    set: StoreApi<NetworkStore>['setState'],
    get: StoreApi<NetworkStore>['getState'],
    api: StoreApi<NetworkStore>,
  ) =>
    config(
      async (args) => {
        const currentNetworkId: IdType =
          useWorkspaceStore.getState().workspace.currentNetworkId
        set(args)
        const updated: Network | undefined =
          get().networks.get(currentNetworkId)
        const deleted = updated === undefined
        if (!deleted) {
          console.debug('DB Update: network store', updated)
          await putNetworkToDb(updated)
        }
      },
      get,
      api,
    )

export const useNetworkStore = create(
  subscribeWithSelector(
    immer<NetworkStore>(
      persist((set, get) => ({
        networks: new Map<IdType, Network>(),
        lastModified: undefined,

        addNode: (networkId: IdType, nodeId: IdType) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network === undefined) {
              console.log(`Network with ID ${networkId} not found.`);
              return state;
            }else{
              if(network.nodes.some(node => node.id === nodeId)) {
                console.log('Failed to add a node to the network! The nodeID has been used.')
                return state
              }
              NetworkFn.addNode(network, nodeId)
              return {
                networks: { ...state.networks },
              }
            }
          })
        },
        addNodes: (networkId: IdType, nodeIds: IdType[]) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network === undefined) {
              console.log(`Network with ID ${networkId} not found.`);
              return state;
            }else{
                const uniqueNodeIds = new Set(nodeIds);
                if (uniqueNodeIds.size !== nodeIds.length){
                  console.log('Failed to add nodes to the network! NodeId must be unique.')
                  return state;
                }
                for(const nodeId of nodeIds){
                  if (network.nodes.some(node => node.id === nodeId)){
                    console.log(`Failed to add nodes to the network! Node ID ${nodeId} has been used.`)
                    return state;
                  }
                }
                NetworkFn.addNodes(network, nodeIds)
              
              return {
                networks: { ...state.networks },
              }
            }
          })
        },

        deleteNodes: (networkId: IdType, nodeIds: IdType[]) => {
          set((state) => {
            if (nodeIds.length === 0) {
              return state
            }
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const deletedElements = NetworkFn.deleteNodes(network, nodeIds)
              const deletedNodes = deletedElements.nodes()
              const deletedEdges = deletedElements.edges()
              const deletedNodeIds = deletedNodes.map((node) => node.id())
              const deletedEdgeIds = deletedEdges.map((edge) => edge.id())
              const deleted = [...deletedNodeIds, ...deletedEdgeIds]
              const event: NetworkUpdatedEvent = {
                networkId,
                type: UpdateEventType.DELETE,
                payload: deleted,
              }
              state.lastUpdated = event
            }
            return state
          })
        },
        deleteEdges: (networkId: IdType, edgeIds: IdType[]) => {
          set((state) => {
            if (edgeIds.length === 0) {
              return state
            }

            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const deletedElements = NetworkFn.deleteEdges(network, edgeIds)

              const deletedEdges = deletedElements.edges()
              const deletedEdgeIds = deletedEdges.map((edge) => edge.id())
              const event: NetworkUpdatedEvent = {
                networkId,
                type: UpdateEventType.DELETE,
                payload: deletedEdgeIds,
              }
              state.lastUpdated = event
            }
            return state
          })
        },

        addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => {
          set((state) => {
            const network = state.networks.get(networkId);
            if (network === undefined) {
              console.log(`Network with ID ${networkId} not found.`);
              return state;
            }else{
              // Check if the edge ID starts with 'e'
              if (id[0]!=='e'){
                console.log(`Failed to add an edge: Edge ID ${id} must start with 'e'.`);
                return state;
              }
              // Check if the edge ID is already used
              if (network.edges.some(edge => edge.id === id)) {
                console.log(`Failed to add an edge: Edge ID ${id} is already used.`);
                return state;
              }
              // Check if both source and target nodes exist
              const sourceExists = network.nodes.some(node => node.id === s);
              const targetExists = network.nodes.some(node => node.id === t);
              if (!sourceExists || !targetExists) {
                console.log(`Failed to add an edge: ${!sourceExists ? `Source node ${s}` : `Target node ${t}`} does not exist.`);
                return state;
              }
              // add the edge
              NetworkFn.addEdge(network, { id, s, t });
          
              return {
                networks: { ...state.networks },
              }
            }
          })
        },
        addEdges: (networkId: IdType, edges: Edge[]) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network === undefined) {
              console.log(`Network with ID ${networkId} not found.`);
              return state;
            }else{
              // check if all the edgeIds are unique
              const uniqueEdgeIds = new Set(edges.map(edge=>edge.id));
              if (uniqueEdgeIds.size !== edges.length){
                console.log('Failed to add edges to the network! EdgeId must be unique.')
                return state;
              }
              for(const newEdge of edges){ 
                // Check if the edge ID starts with 'e'
                if (newEdge.id[0]!=='e'){
                  console.log(`Failed to add an edge: Edge ID ${newEdge.id} must start with 'e'.`);
                  return state;
                }
                // Check if the edge ID is already used
                if (network.edges.some(edge => edge.id === newEdge.id)) {
                  console.log(`Failed to add an edge: Edge ID ${newEdge.id} is already used.`);
                  return state;
                }
                // Check if both source and target nodes exist
                const sourceExists = network.nodes.some(node => node.id === newEdge.s);
                const targetExists = network.nodes.some(node => node.id === newEdge.t);
                if (!sourceExists || !targetExists) {
                  console.log(`Failed to add an edge: ${!sourceExists ? `Source node ${newEdge.s}` : `Target node ${newEdge.t}`} does not exist.`);
                  return state;
                }
              }
              // add the edge
              NetworkFn.addEdges(network, edges)
              return {
                networks: { ...state.networks },
              }
            }
          })
        },

        /**
         *
         * Add a new network to the store
         *
         * @param network new network to be added
         * @returns
         */
        add: (network: Network) =>
          set((state) => {
            if (state.networks.has(network.id)) {
              console.warn('Network already exists in store', network.id)
              return state
            }

            const newNetworkMap = new Map(state.networks).set(
              network.id,
              network,
            )
            state.networks = newNetworkMap
            void putNetworkToDb(network)
              .then(() => {
                console.debug('* New network has been added to DB', network.id)
              })
              .catch((err) => {
                console.error('Failed adding network to DB', err)
              })
            return state
          }),
        delete: (networkId: IdType) =>
          set((state) => {
            state.networks.delete(networkId)
            void deleteNetworkFromDb(networkId).then(() => {
              console.log('## Deleted network from db', networkId)
            })
            return state
          }),
        deleteAll: () =>
          set((state) => {
            clearNetworksFromDb()
              .then(() => {
                console.log('Deleted all networks from db')
              })
              .catch((err) => {
                console.warn('Error clearing all networks from db', err)
              })

            return { ...state, networks: new Map<IdType, Network>() }
          }),
      })),
    ),
  ),
)
