import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { EdgeView, NetworkView } from '../../../models/ViewModel'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useUndoStack } from '../../../task/UndoStack'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { Edge, Network } from '../../../models/NetworkModel'
import { ValueType } from '../../../models/TableModel'
import { useTableStore } from '../../../store/TableStore'
import { TableRecord } from '../../../models'

export const DeleteSelectedEdgesMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { postEdit } = useUndoStack()

  const [disabled, setDisabled] = useState<boolean>(true)

  const deleteSelectedEdges = useNetworkStore((state) => state.deleteEdges)
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const network: Network | undefined = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  )

  const tableRecord: TableRecord = useTableStore(
    (state) => state.tables[currentNetworkId],
  )

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const selectedEdges: IdType[] =
    viewModel !== undefined ? viewModel.selectedEdges : []

  useEffect(() => {
    if (selectedEdges.length > 0) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedEdges])

  const handleDeleteEdges = (): void => {
    // Close the menu first, and then delete the edges
    props.handleClose()

    // Grab actual edge model from network store
    if (network === undefined) {
      console.error('Network not found in store')
      return
    }

    const edgesToBeDeleted: Edge[] = network.edges.filter((e) =>
      selectedEdges.includes(e.id),
    )

    // Record the deleted edge view models
    const deletedEdgeViewModels: EdgeView[] = []
    if (viewModel !== undefined) {
      const { edgeViews } = viewModel
      edgesToBeDeleted.forEach((edge: Edge) => {
        const edgeId: IdType = edge.id
        deletedEdgeViewModels.push(edgeViews[edgeId])
      })
    }

    const deletedEdgeRows = new Map<IdType, Record<string, ValueType>>()
    if (tableRecord !== undefined) {
      edgesToBeDeleted.forEach((edge: Edge) => {
        const row = tableRecord.edgeTable.rows.get(edge.id)
        if (row !== undefined) {
          deletedEdgeRows.set(edge.id, { ...row })
        }
      })
    }

    postEdit(
      UndoCommandType.DELETE_EDGES,
      'Delete Edges',
      [
        currentNetworkId,
        edgesToBeDeleted,
        deletedEdgeViewModels,
        deletedEdgeRows,
      ],

      // Redo means we need to delete the selected edges again
      [currentNetworkId, selectedEdges],
    )
    deleteSelectedEdges(currentNetworkId, selectedEdges)
  }

  return (
    <MenuItem disabled={disabled} onClick={handleDeleteEdges}>
      Delete Selected Edges
    </MenuItem>
  )
}
