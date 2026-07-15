import AddIcon from '@mui/icons-material/Add'
import { ReactElement, useEffect, useState } from 'react'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateEdge } from '../../../data/hooks/useCreateEdge'
import { isHCX } from '../../../features/HierarchyViewer/utils/hierarchyUtil'
import { NetworkView } from '../../../models'
import { IdType } from '../../../models/IdType'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

// Stable fallback so the `selectedNodes` dep does not change identity
// on every render when no view model exists
const EMPTY_NODES: IdType[] = []

export const CreateEdgeMenuItem = (props: BaseMenuItemProps): ReactElement => {
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
    viewModel !== undefined ? viewModel.selectedNodes : EMPTY_NODES

  // Check if current view supports creation:
  // only node-link diagrams (or the default view) allow creation
  const isCreationEnabled: boolean =
    viewModel === undefined ||
    viewModel.type === undefined ||
    viewModel.type === 'nodeLink'
  const isHierarchy: boolean = networkSummary ? isHCX(networkSummary) : false

  useEffect(() => {
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
  }, [
    selectedNodes,
    targetNetworkId,
    currentNetworkId,
    isCreationEnabled,
    isHierarchy,
  ])

  const handleCreateEdge = (): void => {
    // Use the first two selected nodes
    const sourceNodeId = selectedNodes[0]
    const targetNodeId = selectedNodes[1]

    // Create edge directly with default empty attributes
    createEdge(currentNetworkId, sourceNodeId, targetNodeId, {
      attributes: {},
    })
    props.onClick()
  }

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
    <DropdownMenuItem
      label="Create Edge"
      icon={<AddIcon />}
      disabled={disabled}
      onClick={handleCreateEdge}
      tooltip={tooltipText}
    />
  )
}
