import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { useUndoStack, useUndoStack2 } from '../../../task/ApplyVisualStyle'
import { useTableStore } from '../../../store/TableStore'
import NetworkFn from '../../../models/NetworkModel'
import { Node, Edge } from '../../../models/NetworkModel'
import { Core } from 'cytoscape'
import _ from 'lodash'
import { useUiStateStore } from '../../../store/UiStateStore'

export const DeleteSelectedNodesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { postEdit } = useUndoStack2()

  const [disabled, setDisabled] = useState<boolean>(true)
  const deleteSelectedNodes = useNetworkStore((state) => state.deleteNodes)

  const activeNetworkView: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const activeNetworkViewTabIndex =
    useUiStateStore((state) => state.ui?.networkViewUi?.activeTabIndex) ?? 0

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const targetNetworkId: IdType =
    activeNetworkView === '' ? currentNetworkId : activeNetworkView

  const networkView = useViewModelStore((state) =>
    state.getViewModel(targetNetworkId),
  )

  const selectedNodes: IdType[] =
    networkView !== undefined ? networkView.selectedNodes : []

  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  )

  const addNodesAndEdges = useNetworkStore((state) => state.addNodesAndEdges)

  const editRows = useTableStore((state) => state.editRows)
  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const cyNet: Core = NetworkFn.getInternalNetworkDataStore(
    network ?? {
      id: '',
      nodes: [] as Node[],
      edges: [] as Edge[],
    },
  ) as Core

  const table = useTableStore((state) => state.tables[currentNetworkId])
  const edgeTable = table?.edgeTable
  const nodeTable = table?.nodeTable
  useEffect(() => {
    if (selectedNodes.length > 0) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedNodes])

  const handleDeleteNodes = (): void => {
    // TODO: ask user to confirm deletion
    const connectedEdges = cyNet
      .nodes()
      .filter((node) => selectedNodes.includes(node.id()))
      .connectedEdges()
    const prevNodeRows = new Map()
    selectedNodes.forEach((nodeId) => {
      const rowData = nodeTable?.rows.get(nodeId)
      if (rowData) {
        prevNodeRows.set(nodeId, rowData)
      }
    })
    const prevNodeIds =
      network?.nodes
        .filter((n) => selectedNodes.includes(n.id))
        .map((n) => n.id) ?? []
    const prevEdges = network?.edges.filter((e) =>
      connectedEdges.map((edge) => edge.id()).includes(e.id),
    )
    const prevEdgeRows = new Map()
    connectedEdges.forEach((edge) => {
      const rowData = edgeTable?.rows.get(edge.id())
      if (rowData) {
        prevEdgeRows.set(edge.id(), rowData)
      }
    })

    const prevPositions = new Map<IdType, [number, number]>()

    Object.entries(networkView?.nodeViews ?? {})
      .filter(([n, nodeView]) => prevNodeIds.includes(n))
      .forEach(([nodeId, nodeView]) => {
        prevPositions.set(nodeId, [nodeView.x, nodeView.y])
      })

    console.log(
      'UNDO',
      targetNetworkId,
      prevNodeIds,
      prevEdges,
      prevNodeRows,
      prevEdgeRows,
      prevPositions,
    )

    postEdit(
      UndoCommandType.DELETE_NODES,
      () => {
        addNodesAndEdges(targetNetworkId, prevNodeIds ?? [], prevEdges ?? [])
        editRows(targetNetworkId, 'node', prevNodeRows)
        editRows(targetNetworkId, 'edge', prevEdgeRows)
        updateNodePositions(targetNetworkId, prevPositions)
        console.log(
          'UNDO',
          targetNetworkId,
          prevNodeIds,
          prevEdges,
          prevNodeRows,
          prevEdgeRows,
          prevPositions,
        )
      },
      () => {
        deleteSelectedNodes(currentNetworkId, selectedNodes)
      },
    )
    // postEdit(UndoCommandType.DELETE_NODES, [
    //   currentNetworkId,
    //   prevNodeIds,
    //   prevNodeRows,
    //   prevEdges,
    //   prevEdgeRows,
    // ])
    deleteSelectedNodes(currentNetworkId, selectedNodes)

    props.handleClose()
  }

  // const handleDeleteNodes = (): void => {
  //   // TODO: ask user to confirm deletion
  //   const networkCopy = _.cloneDeep(network)
  //   postEdit(UndoCommandType.DELETE_NODES, [
  //     currentNetworkId,
  //     networkCopy,
  //     nodeTable,
  //     edgeTable,
  //   ])

  //   props.handleClose()
  //   deleteSelectedNodes(currentNetworkId, selectedNodes)
  // }

  return (
    <MenuItem disabled={disabled} onClick={handleDeleteNodes}>
      Delete Selected Nodes
    </MenuItem>
  )
}
