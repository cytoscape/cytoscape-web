import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateNode } from '../../../data/hooks/useCreateNode'
import { IdType } from '../../../models/IdType'
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

  const getViewport = useRendererStore((state) => state.getViewport)

  useEffect(() => {
    // Disable the menu item if the sub network view is selected
    if (targetNetworkId === currentNetworkId) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [targetNetworkId, currentNetworkId])

  const handleCreateNode = (): void => {
    props.handleClose()

    // Get the viewport center (pan position)
    const viewport = getViewport('cyjs', currentNetworkId)
    const centerX = viewport?.pan.x ?? 0
    const centerY = viewport?.pan.y ?? 0

    // Create the node at the viewport center
    createNode(currentNetworkId, [centerX, centerY])
  }

  return (
    <MenuItem disabled={disabled} onClick={handleCreateNode}>
      Create Node
    </MenuItem>
  )
}

