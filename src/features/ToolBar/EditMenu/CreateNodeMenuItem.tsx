import { MenuItem, Tooltip } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateNode } from '../../../data/hooks/useCreateNode'
import { IdType } from '../../../models/IdType'
import { NetworkView } from '../../../models/ViewModel'
import { NodeCreationDialog } from '../../NetworkPanel/CyjsRenderer/NodeCreationDialog'
import { BaseMenuProps } from '../BaseMenuProps'

export const CreateNodeMenuItem = (props: BaseMenuProps): ReactElement => {
  const { createNode } = useCreateNode()

  const [disabled, setDisabled] = useState<boolean>(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<
    [number, number, number?] | null
  >(null)

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
    // Disable the menu item if the sub network view is selected or creation is not enabled
    if (targetNetworkId === currentNetworkId && isCreationEnabled) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [targetNetworkId, currentNetworkId, networkView])


  const handleCreateNode = (): void => {
    // Get the viewport center (pan position)
    const viewport = getViewport('cyjs', currentNetworkId)
    const centerX = viewport?.pan.x ?? 0
    const centerY = viewport?.pan.y ?? 0

    // Set dialog state first
    setPendingPosition([centerX, centerY])
    setDialogOpen(true)
  
  }

  const handleDialogConfirm = (
    position: [number, number, number?],
    attributes: Record<string, any>,
  ): void => {
    const result = createNode(currentNetworkId, position, { attributes })
    if (result.success) {
      setDialogOpen(false)
      setPendingPosition(null)
    }
  }

  const handleDialogCancel = (): void => {
    setDialogOpen(false)
    setPendingPosition(null)
  }

  const isCreationEnabled = canCreateInView()
  const tooltipText = !isCreationEnabled
    ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
    : ''

  return (
    <>
      <Tooltip title={tooltipText} placement="left">
        <span>
          <MenuItem disabled={disabled} onClick={handleCreateNode}>
            Create Node
          </MenuItem>
        </span>
      </Tooltip>
      {pendingPosition && (
        <NodeCreationDialog
          open={dialogOpen}
          networkId={currentNetworkId}
          position={pendingPosition}
          onCancel={handleDialogCancel}
          onConfirm={handleDialogConfirm}
        />
      )}
    </>
  )
}
