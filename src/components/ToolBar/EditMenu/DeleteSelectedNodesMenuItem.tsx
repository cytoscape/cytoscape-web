import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useViewModelStore } from '../../../store/ViewModelStore'

import { useUndoStack } from '../../../task/UndoStack'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import {
  Edge,
  EdgeView,
  NetworkView,
  NodeView,
  ValueType,
} from '../../../models'
import { useTableStore } from '../../../store/TableStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { target } from '../../../../webpack.config'

export const DeleteSelectedNodesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { postEdit } = useUndoStack()

  const [disabled, setDisabled] = useState<boolean>(true)
  const deleteSelectedNodes = useNetworkStore((state) => state.deleteNodes)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  // Grab active network view id
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const targetNetworkId: IdType =
    activeNetworkId === undefined || activeNetworkId === ''
      ? currentNetworkId
      : activeNetworkId

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const tableRecord = useTableStore((state) => state.tables[currentNetworkId])

  const selectedNodes: IdType[] =
    viewModel !== undefined ? viewModel.selectedNodes : []

  useEffect(() => {
    // Disable the menu item if there are no selected nodes
    // or if the sub network view is selected
    if (selectedNodes.length > 0 && targetNetworkId === currentNetworkId) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedNodes, targetNetworkId])

  const handleDeleteNodes = (): void => {
    props.handleClose()

    // Need to record the view models for nodes and edges
    const deletedNodeViewModels: NodeView[] = []
    if (viewModel !== undefined) {
      const { nodeViews } = viewModel
      selectedNodes.forEach((nodeId: IdType) => {
        deletedNodeViewModels.push(nodeViews[nodeId])
      })
    }

    const deletedEdges: Edge[] = deleteSelectedNodes(
      currentNetworkId,
      selectedNodes,
    )

    // Record the deleted edge view models
    const deletedEdgeViewModels: EdgeView[] = []
    if (viewModel !== undefined) {
      const { edgeViews } = viewModel
      deletedEdges.forEach((edge: Edge) => {
        const edgeId: IdType = edge.id
        deletedEdgeViewModels.push(edgeViews[edgeId])
      })
    }

    const deletedNodeRows = new Map<IdType, Record<string, ValueType>>()
    const deletedEdgeRows = new Map<IdType, Record<string, ValueType>>()
    if (tableRecord !== undefined) {
      selectedNodes.forEach((nodeId) => {
        const row = tableRecord.nodeTable.rows.get(nodeId)
        if (row !== undefined) {
          deletedNodeRows.set(nodeId, { ...row }) // Clone row data
        }
      })
      deletedEdges.forEach((edge) => {
        const row = tableRecord.edgeTable.rows.get(edge.id)
        if (row !== undefined) {
          deletedEdgeRows.set(edge.id, { ...row }) // Clone row data
        }
      })
    }

    // TODO: Need to record the deleted bypasses??

    postEdit(
      UndoCommandType.DELETE_NODES,
      'Delete Nodes',
      // This is for adding back the deleted nodes and edges, views, tables, bypasses
      [
        currentNetworkId,
        selectedNodes,
        deletedEdges,
        deletedNodeViewModels,
        deletedEdgeViewModels,
        deletedNodeRows,
        deletedEdgeRows,
      ],

      // Redo means removing the deleted nodes and edges again
      [currentNetworkId, selectedNodes],
    )
  }

  return (
    <MenuItem disabled={disabled} onClick={handleDeleteNodes}>
      Delete Selected Nodes
    </MenuItem>
  )
}
