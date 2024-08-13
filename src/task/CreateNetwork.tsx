import NetworkFn, { NetworkAttributes } from '../models/NetworkModel'
import { IdType, Network, NetworkView, Table, VisualStyle } from '../models'
import { v4 as uuidv4 } from 'uuid'
import TableFn from '../models/TableModel'
import ViewModelFn from '../models/ViewModel'
import VisualStyleFn from '../models/VisualStyleModel'
import { NetworkWithView } from '../models/NetworkWithViewModel'
import { useNetworkStore } from '../store/NetworkStore'
import { useTableStore } from '../store/TableStore'
import { useViewModelStore } from '../store/ViewModelStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useCallback } from 'react'

export const createEmptyNetwork = (): Network => {
  const id: IdType = uuidv4()
  const newNetwork = NetworkFn.createNetworkFromLists(id, [], [])

  console.log('Created::', newNetwork)
  return newNetwork
}

export const createView = (network: Network): NetworkWithView => {
  const networkId: IdType = network.id

  // Add base columns (e.g., name)
  const nodeTable: Table = TableFn.createTable(networkId)
  const edgeTable: Table = TableFn.createTable(networkId)
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
  const networkView: NetworkView = ViewModelFn.createViewModel(network)
  const networkAttributes: NetworkAttributes = {
    id: networkId,
    attributes: {},
  }

  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    networkAttributes,
  }
}

/**
 * Register all of the objects in the given networkWithView object
 *
 */
export const useCreateNetworkWithView = (): (() => NetworkWithView) => {
  const addNetwork = useNetworkStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)

  const createNetworkWithView = useCallback(() => {
    const network = createEmptyNetwork()
    const withView = createView(network)
    addNetwork(network)
    addVisualStyle(network.id, withView.visualStyle)
    addTable(network.id, withView.nodeTable, withView.edgeTable)
    addViewModel(network.id, withView.networkViews[0])

    return withView
  }, [addNetwork, addViewModel, addVisualStyle])

  return createNetworkWithView
}
