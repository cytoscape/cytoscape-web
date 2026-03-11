import { MenuItem, Tooltip } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateNode } from '../../../data/hooks/useCreateNode'
import { isHCX } from '../../../features/HierarchyViewer/utils/hierarchyUtil'
import { IdType } from '../../../models/IdType'
import { NetworkView } from '../../../models/ViewModel'
import { BaseMenuProps } from '../BaseMenuProps'

export const CreateNodeMenuItem = (props: BaseMenuProps): ReactElement => {
  const { createNode } = useCreateNode()

  const [disabled, setDisabled] = useState<boolean>(false)

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

  const networkView: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const networkSummary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const getViewport = useRendererStore((state) => state.getViewport)

  // Check if current view supports creation
  const canCreateInView = (): boolean => {
    if (networkView === undefined) {
      return true // Default view supports creation
    }
    const viewType = networkView.type
    // Only allow creation in node-link diagrams
    return viewType === undefined || viewType === 'nodeLink'
  }

  useEffect(() => {
    const isCreationEnabled = canCreateInView()
    const isHierarchy = networkSummary ? isHCX(networkSummary) : false
    // Disable the menu item if the sub network view is selected, creation is not enabled, or network is a hierarchy
    if (targetNetworkId === currentNetworkId && isCreationEnabled && !isHierarchy) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [targetNetworkId, currentNetworkId, networkView, networkSummary])


  const handleCreateNode = (): void => {
    // Get the viewport center (pan position)
    const viewport = getViewport('cyjs', currentNetworkId)
    const centerX = viewport?.pan.x ?? 0
    const centerY = viewport?.pan.y ?? 0

    // Create node directly with default empty attributes
    createNode(currentNetworkId, [centerX, centerY], { attributes: {} })
    props.handleClose()
  }

  const isCreationEnabled = canCreateInView()
  const isHierarchy = networkSummary ? isHCX(networkSummary) : false
  const tooltipText = isHierarchy
    ? 'Creation not available for hierarchy networks'
    : !isCreationEnabled
      ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
      : ''

  return (
    <Tooltip title={tooltipText} placement="left">
      <span>
        <MenuItem disabled={disabled} onClick={handleCreateNode}>
          Create Node
        </MenuItem>
      </span>
    </Tooltip>
  )
}
