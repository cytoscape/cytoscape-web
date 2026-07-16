import AddIcon from '@mui/icons-material/Add'
import { ReactElement, useEffect, useState } from 'react'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateNode } from '../../../data/hooks/useCreateNode'
import { isHCX } from '../../../features/HierarchyViewer/utils/hierarchyUtil'
import { IdType } from '../../../models/IdType'
import { NetworkView } from '../../../models/ViewModel'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const CreateNodeMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const { createNode } = useCreateNode()

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

  const networkView: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  const networkSummary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const getViewport = useRendererStore((state) => state.getViewport)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const visualStyleOption = useUiStateStore(
    (state) => state.ui.visualStyleOptions[currentNetworkId],
  )

  // Check if current view supports creation:
  // only node-link diagrams (or the default view) allow creation
  const isCreationEnabled: boolean =
    networkView === undefined ||
    networkView.type === undefined ||
    networkView.type === 'nodeLink'
  const isHierarchy: boolean = networkSummary ? isHCX(networkSummary) : false

  useEffect(() => {
    // Disable the menu item if the sub network view is selected, creation is not enabled, or network is a hierarchy
    if (
      currentNetworkId &&
      targetNetworkId === currentNetworkId &&
      isCreationEnabled &&
      !isHierarchy
    ) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [targetNetworkId, currentNetworkId, isCreationEnabled, isHierarchy])

  const handleCreateNode = (): void => {
    // Get the viewport center (pan position)
    const viewport = getViewport('cyjs', currentNetworkId)
    const panX = viewport?.pan.x ?? 0
    const panY = viewport?.pan.y ?? 0
    const zoom = viewport?.zoom ?? 1

    // Random padding between 5 and 50, so multiple added nodes don't overlap exactly on top of each other
    const pad = Math.floor(Math.random() * 45) + 5
    // Get the default node width and height from the visual style
    const style = visualStyles[currentNetworkId]
    const defNodeWidth = style?.nodeWidth?.defaultValue ?? 50
    const defNodeHeight = style?.nodeHeight?.defaultValue ?? 50
    // Calculate an offset to ensure the new node is fully visible within the viewport,
    // based on the default node size and the padding
    const nodeSizeLocked =
      visualStyleOption?.visualEditorProperties?.nodeSizeLocked
    const offsetY = (defNodeHeight as number) / 2 + pad
    const offsetX = nodeSizeLocked
      ? offsetY
      : (defNodeWidth as number) / 2 + pad // if node size locked, use height for both width and height
    // Calculate the position to place the new node in the top-left corner, adjusted for pan, zoom and offset
    const x = -panX / zoom + offsetX
    const y = -panY / zoom + offsetY

    // Create node directly with default empty attributes
    createNode(currentNetworkId, [x, y], { attributes: {} })
    props.onClick()
  }

  const tooltipText = isHierarchy
    ? 'Creation not available for hierarchy networks'
    : !isCreationEnabled
      ? 'Creation not available in circle packing view. Switch to node-link view to create elements.'
      : ''

  return (
    <DropdownMenuItem
      label="Create Node"
      icon={<AddIcon />}
      disabled={disabled}
      onClick={handleCreateNode}
      tooltip={tooltipText}
    />
  )
}
