import { Box } from '@mui/material'
import { MouseEvent, ReactElement } from 'react'

import { Network } from '../../models/NetworkModel'
import { Renderer } from '../../models/RendererModel/Renderer'
import { FloatingToolBar } from '../FloatingToolBar'
import { FloatingLayoutToolsPanel } from '../LayoutTools'

interface NetworkTabProps {
  network: Network
  renderer: Renderer
  isActive: boolean
  bgColor?: string
  handleClick?: () => void
  selected: boolean
  boxSize?: { w: number; h: number }
  hasTab?: boolean
}

export const NetworkTab = ({
  network,
  renderer,
  bgColor,
  handleClick,
  isActive,
  selected,
  boxSize,
  hasTab,
}: NetworkTabProps): ReactElement => {
  const rendererComponent = renderer.getComponent(
    network,
    boxSize,
    selected,
    hasTab,
  )

  return (
    <Box
      data-testid="network-tab"
      sx={{
        // The floating toolbar and Layout Tools panel are placed against this
        // box. Without it they would be placed against the pane, which in a
        // hierarchy also holds the view tabs (TREE VIEW / CELL VIEW), and
        // react-draggable's parent bounds would let the Layout Tools panel
        // be dragged over those tabs (#887).
        position: 'relative',
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        backgroundColor: bgColor !== undefined ? bgColor : '#ffffff',
        // Focus border (visible when active)
        border: (theme) =>
          isActive
            ? `2px solid ${theme.palette.primary.main}`
            : '2px solid transparent',
        // Mount all components in the background but display only the selected one
        display: selected ? 'block' : 'none',
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: '100%',
          // Gap so the border color does not disappear on darker backgrounds
          border: (theme) =>
            isActive
              ? `1px solid ${theme.palette.common.white}`
              : '1px solid transparent',
        }}
        // First click on an inactive renderer should only activate this tab and
        // must not trigger renderer-level click handlers (e.g. CP background reset).
        onClickCapture={(event: MouseEvent<HTMLDivElement>) => {
          const target = event.target as HTMLElement
          const isMenu = target.closest('[role="menu"]') !== null
          const isMenuItem = target.closest('[role="menuitem"]') !== null
          const isDialog = target.closest('[role="dialog"]') !== null
          const isDialogButton =
            target.closest('[role="dialog"] button') !== null ||
            target.closest('.MuiDialog-root button') !== null

          // Never intercept menu, menu item, or dialog clicks
          if (isMenu || isMenuItem || isDialog || isDialogButton) {
            return
          }

          if (!isActive) {
            event.stopPropagation()
            handleClick?.()
          }
        }}
        // Once active, allow the click to bubble to renderer content while still
        // notifying the panel (idempotent) to keep activation state in sync.
        onClick={(event: MouseEvent<HTMLDivElement>) => {
          const target = event.target as HTMLElement
          const isMenu = target.closest('[role="menu"]') !== null
          const isMenuItem = target.closest('[role="menuitem"]') !== null
          const isDialog = target.closest('[role="dialog"]') !== null
          const isDialogButton =
            target.closest('[role="dialog"] button') !== null ||
            target.closest('.MuiDialog-root button') !== null

          // Never intercept menu, menu item, or dialog clicks
          if (isMenu || isMenuItem || isDialog || isDialogButton) {
            return
          }

          if (!isActive) {
            event.stopPropagation()
            return
          }
          handleClick?.()
        }}
      >
        {rendererComponent}
      </Box>
      <FloatingToolBar rendererId={renderer.id} viewNetworkId={network.id} />
      <FloatingLayoutToolsPanel />
    </Box>
  )
}
