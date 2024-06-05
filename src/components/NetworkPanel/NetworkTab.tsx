import { Box } from '@mui/material'
import { ReactElement } from 'react'
import { FloatingToolBar } from '../FloatingToolBar'
import { Network } from '../../models/NetworkModel'
import { Renderer } from '../../models/RendererModel/Renderer'

interface NetworkTabProps {
  network: Network
  renderer: Renderer
  isActive: boolean
  bgColor?: string
  handleClick?: () => void
  selected: boolean
  boxSize?: { w: number; h: number }
}

export const NetworkTab = ({
  network,
  renderer,
  bgColor,
  handleClick,
  isActive,
  selected,
  boxSize,
}: NetworkTabProps): ReactElement => {
  return (
    <Box
      sx={{
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        backgroundColor: bgColor !== undefined ? bgColor : '#FFFFFF',
        border: isActive ? '3px solid orange' : '3px solid transparent',
        // Adjust the hidden bottom border to be 4px
        borderBottom: isActive ? '4px solid orange' : '4px solid transparent',
        display: selected ? 'block' : 'none',
      }}
      onClick={handleClick}
    >
      {renderer.getComponent(network, boxSize)}
      <FloatingToolBar />
    </Box>
  )
}
