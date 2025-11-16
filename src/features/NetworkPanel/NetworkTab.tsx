import { Box } from '@mui/material'
import { MouseEvent, ReactElement } from 'react'

import { Network } from '../../models/NetworkModel'
import { Renderer } from '../../models/RendererModel/Renderer'
import { FloatingToolBar } from '../FloatingToolBar'

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
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        backgroundColor: bgColor !== undefined ? bgColor : '#FFFFFF',
        border: isActive ? '3px solid orange' : '3px solid transparent',
        // Adjust the hidden bottom border to be 4px
        borderBottom: isActive ? '4px solid orange' : '4px solid transparent',

        // Mount all components in the background but display only the selected one
        display: selected ? 'block' : 'none',
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: '100%',
        }}
        // First click on an inactive renderer should only activate this tab and
        // must not trigger renderer-level click handlers (e.g. CP background reset).
        onClickCapture={(event: MouseEvent<HTMLDivElement>) => {
          if (!isActive) {
            event.stopPropagation()
            handleClick?.()
          }
        }}
        // Once active, allow the click to bubble to renderer content while still
        // notifying the panel (idempotent) to keep activation state in sync.
        onClick={(event: MouseEvent<HTMLDivElement>) => {
          if (!isActive) {
            event.stopPropagation()
            return
          }
          handleClick?.()
        }}
      >
        {rendererComponent}
      </Box>
      <FloatingToolBar rendererId={renderer.id} />
    </Box>
  )
}
