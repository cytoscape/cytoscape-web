import { MenuItem, Tooltip } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateEdge } from '../../../data/hooks/useCreateEdge'
import { NetworkView } from '../../../models'
import { IdType } from '../../../models/IdType'
import { ValueType } from '../../../models/TableModel'
import { EdgeCreationDialog } from '../../NetworkPanel/CyjsRenderer/EdgeCreationDialog'
import { BaseMenuProps } from '../BaseMenuProps'

export const CreateEdgeMenuItem = (props: BaseMenuProps): ReactElement => {
  const { createEdge } = useCreateEdge()

  const [disabled, setDisabled] = useState<boolean>(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingSource, setPendingSource] = useState<IdType | null>(null)
  const [pendingTarget, setPendingTarget] = useState<IdType | null>(null)

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

  const selectedNodes: IdType[] =
    viewModel !== undefined ? viewModel.selectedNodes : []

  // Check if current view supports creation
  const canCreateInView = (): boolean => {
    if (viewModel === undefined) {
      return true // Default view supports creation
    }
    const viewType = viewModel.type
    // Only allow creation in node-link diagrams
    return viewType === undefined || viewType === 'nodeLink'
  }

  useEffect(() => {
    const isCreationEnabled = canCreateInView()
    // Disable the menu item if fewer than 2 nodes are selected,
    // if the sub network view is selected, or if creation is not enabled
    if (
      selectedNodes.length >= 2 &&
      targetNetworkId === currentNetworkId &&
      isCreationEnabled
    ) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedNodes, targetNetworkId, currentNetworkId, viewModel])


  const handleCreateEdge = (): void => {
    // Use the first two selected nodes
    const sourceNodeId = selectedNodes[0]
    const targetNodeId = selectedNodes[1]

    // Open dialog to allow user to set edge attributes
    setPendingSource(sourceNodeId)
    setPendingTarget(targetNodeId)
    setDialogOpen(true)
    
  }

  const handleDialogConfirm = (
    sourceNodeId: IdType,
    targetNodeId: IdType,
    attributes: Record<string, ValueType>,
  ): void => {
    const result = createEdge(currentNetworkId, sourceNodeId, targetNodeId, {
      attributes,
    })
    if (result.success) {
      setDialogOpen(false)
      setPendingSource(null)
      setPendingTarget(null)
    }
  }

  const handleDialogCancel = (): void => {
    setDialogOpen(false)
    setPendingSource(null)
    setPendingTarget(null)
  }

  const isCreationEnabled = canCreateInView()
  const tooltipText = !isCreationEnabled
    ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
    : selectedNodes.length < 2
      ? 'Select at least 2 nodes to create an edge'
      : targetNetworkId !== currentNetworkId
        ? 'Cannot create edges in sub-network view'
        : ''

  return (
    <>
      <Tooltip title={tooltipText} placement="left">
        <span>
          <MenuItem disabled={disabled} onClick={handleCreateEdge}>
            Create Edge
          </MenuItem>
        </span>
      </Tooltip>
      {pendingSource && pendingTarget && (
        <EdgeCreationDialog
          open={dialogOpen}
          networkId={currentNetworkId}
          sourceNodeId={pendingSource}
          targetNodeId={pendingTarget}
          onCancel={handleDialogCancel}
          onConfirm={handleDialogConfirm}
        />
      )}
    </>
  )
}
