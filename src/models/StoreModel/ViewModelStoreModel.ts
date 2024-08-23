import { IdType } from '../IdType'
import { NetworkView, NodeView, EdgeView } from '../ViewModel'

export interface ViewModelState {
  /**
   * A map of network ID to a list of network view models.
   *
   * The first view model in the list is the primary view model.
   * Optional view models are stored from the second element in the list.
   *
   * In most cases, only the primary view model is used.
   * Optional view models will be used for different visualizations, such as circle packing.
   */
  viewModels: Record<IdType, NetworkView[]>
}

export interface ViewModelAction {
  /**
   * Add a new Network View Model to the store.
   * If the network ID already exists, the new view model will be added to the end of the list.
   * If the network ID does not exist, a new list will be created with the new view model.
   *
   * @param networkId The ID of the network model
   * @param networkView The network view model to be added at the end of the list
   */
  add: (networkId: IdType, networkView: NetworkView) => void

  // TODO: Do we need a factory method to create a new view model?
  // create: (networkId: IdType) => NetworkView

  /**
   * Utility function to get the primary (first in the list) network view model
   * of a network if no ID is given
   *
   * @param networkId The ID of the network model
   * @param viewModelName (optional) The name of the view model
   *
   * @returns A network view model
   * */
  getViewModel: (
    networkId: IdType,
    viewModelName?: IdType,
  ) => NetworkView | undefined

  /**
   *
   * Select a new set of nodes and edges. Original selections will be cleared.
   * Selection will be cleared from all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param selectedNodes nodes to be selected. Give an empty array to clear the selection.
   * @param selectedEdges edges to be selected. Give an empty array to clear the selection.
   *
   */
  exclusiveSelect: (
    networkId: IdType,
    selectedNodes: IdType[],
    selectedEdges: IdType[],
  ) => void

  /**
   *
   * Select a new set of nodes OR edges. Original selections will be kept.
   * Selection will be applied to all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param ids nodes or edges to be selected. Give an empty array to clear the selection.
   */
  additiveSelect: (networkId: IdType, ids: IdType[]) => void

  /**
   *
   * Unselect a set of nodes OR edges. Original selections will be kept.
   * Selection will be applied to all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param ids nodes or edges to be unselected. Give an empty array to clear the selection.
   */
  additiveUnselect: (networkId: IdType, ids: IdType[]) => void

  /**
   * Toggle the selection of a set of nodes OR edges.
   * For example, if a node in the ID list is selected, it will be unselected and vice versa.
   * Operation will be applied to all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param ids nodes or edges to be toggled. An empty array will do nothing.
   *
   */
  toggleSelected: (networkId: IdType, ids: IdType[]) => void

  /**
   * Set the new position of a node.
   *
   * TODO: how should we handle the case when the network has multiple view models?
   *
   * @param networkId ID of the network model
   * @param nodeId Target node ID
   * @param position New position of the node (x, y). Z is optional.
   * @param targetViewId (optional) ID of the target view model. If not given, the primary (first) view model will be used.
   *
   */
  setNodePosition: (
    networkId: IdType,
    nodeId: IdType,
    position: [number, number, number?],
    targetViewId?: IdType,
  ) => void

  /**
   * Batch updates node positions.
   *
   * TODO: how should we handle the case when the network has multiple view models?
   *
   * @param networkId ID of the network model
   * @param positions A map of node ID to new position (x, y). Z is optional.
   * @param targetViewId (optional) ID of the target view model. If not given, the primary (first) view model will be used.
   */
  updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
    targetViewId?: IdType,
  ) => void

  /**
   * Delete a set of nodes or edges from the view model.
   * Deletion will be applied to all of the view models for the given network.
   *
   * @param networkId ID of the network model
   * @param ids nodes or edges to be deleted
   */
  deleteObjects: (networkId: IdType, ids: IdType[]) => void

  /**
   * Delete a list of network view models.
   * This method will delete the entire list of view models for the given network.
   *
   * @param networkId ID of the network model
   * @param targetViewId (optional) ID of the target view model to be deleted. If not given, all view models will be deleted.
   */
  delete: (networkId: IdType, targetViewId?: IdType) => void

  /**
   * Delete all network view models for all networks.
   */
  deleteAll: () => void
}

export interface UpdateActions {
  // Add node view (s) to a network
  addNodeView: (networkId: IdType, nodeView: NodeView) => void
  addNodeViews: (networkId: IdType, nodeIds: NodeView[]) => void

  // Add edge view(s) to a network
  addEdgeView: (networkId: IdType, nodeView: EdgeView) => void
  addEdgeViews: (networkId: IdType, edges: EdgeView[]) => void

  // Delete nodes and edges from a network
  deleteNodeViews: (networkId: IdType, nodeIds: IdType[]) => void
  deleteEdgeViews: (networkId: IdType, edgeIds: IdType[]) => void
}

export type ViewModelStore = ViewModelState & ViewModelAction & UpdateActions
