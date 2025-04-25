import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useViewModelStore } from '../../../store/ViewModelStore'

import { useUndoStack } from '../../../task/UndoStack'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { Edge, EdgeView, NetworkView, NodeView } from '../../../models'

export const DeleteSelectedNodesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { postEdit } = useUndoStack()

  const [disabled, setDisabled] = useState<boolean>(true)
  const deleteSelectedNodes = useNetworkStore((state) => state.deleteNodes)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const selectedNodes: IdType[] =
    viewModel !== undefined ? viewModel.selectedNodes : []

  useEffect(() => {
    if (selectedNodes.length > 0) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedNodes])

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

    console.log(
      '!!!!!!!!!deleted objects:',
      deletedEdges,
      deletedNodeViewModels,
      deletedEdgeViewModels,
    )
    postEdit(
      UndoCommandType.DELETE_NODES,
      'Delete Nodes',
      // This is for adding back the deleted nodes and edges
      [currentNetworkId, selectedNodes, deletedEdges, deletedNodeViewModels],

      // This is for removing the deleted nodes and edges again
      [currentNetworkId, selectedNodes],
    )
  }

  // const handleDeleteNodes = (): void => {
  //   props.handleClose()
  //   const deleted = deleteSelectedNodes(currentNetworkId, selectedNodes)
  //   console.log('!!!!!!!!!deleted objects:', deleted)
  // }

  return (
    <MenuItem disabled={disabled} onClick={handleDeleteNodes}>
      Delete Selected Nodes
    </MenuItem>
  )
}
