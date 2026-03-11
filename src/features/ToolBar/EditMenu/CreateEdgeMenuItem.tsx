import { MenuItem, Tooltip } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateEdge } from '../../../data/hooks/useCreateEdge'
import { isHCX } from '../../../features/HierarchyViewer/utils/hierarchyUtil'
import { NetworkView } from '../../../models'
import { IdType } from '../../../models/IdType'
import { BaseMenuProps } from '../BaseMenuProps'

export const CreateEdgeMenuItem = (props: BaseMenuProps): ReactElement => {
  const { createEdge } = useCreateEdge()

  const [disabled, setDisabled] = useState<boolean>(true)

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

  const networkSummary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
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
    const isHierarchy = networkSummary ? isHCX(networkSummary) : false
    // Disable the menu item if fewer than 2 nodes are selected,
    // if the sub network view is selected, creation is not enabled, or network is a hierarchy
    if (
      selectedNodes.length >= 2 &&
      targetNetworkId === currentNetworkId &&
      isCreationEnabled &&
      !isHierarchy
    ) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [selectedNodes, targetNetworkId, currentNetworkId, viewModel, networkSummary])


  const handleCreateEdge = (): void => {
    // Use the first two selected nodes
    const sourceNodeId = selectedNodes[0]
    const targetNodeId = selectedNodes[1]

    // Create edge directly with default empty attributes
    createEdge(currentNetworkId, sourceNodeId, targetNodeId, {
      attributes: {},
    })
    props.handleClose()
  }

  const isCreationEnabled = canCreateInView()
  const isHierarchy = networkSummary ? isHCX(networkSummary) : false
  const tooltipText = isHierarchy
    ? 'Creation not available for hierarchy networks'
    : !isCreationEnabled
      ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
      : selectedNodes.length < 2
        ? 'Select at least 2 nodes to create an edge'
        : targetNetworkId !== currentNetworkId
          ? 'Cannot create edges in sub-network view'
          : ''

  return (
    <Tooltip title={tooltipText} placement="left">
      <span>
        <MenuItem disabled={disabled} onClick={handleCreateEdge}>
          Create Edge
        </MenuItem>
      </span>
    </Tooltip>
  )
}
