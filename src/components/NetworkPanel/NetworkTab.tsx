import { Box } from '@mui/material'
import { ReactElement } from 'react'
import { FloatingToolBar } from '../FloatingToolBar'

interface NetworkTabProps {
  renderer: JSX.Element
  isActive: boolean
  bgColor?: string
  handleClick?: () => void
}

export const NetworkTab = ({
  renderer,
  bgColor,
  handleClick,
  isActive,
}: NetworkTabProps): ReactElement => {
  return (
    <Box
      sx={{
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        backgroundColor: bgColor !== undefined ? bgColor : '#FFFFFF',
        border: isActive ? '3px solid orange' : '3px solid transparent',
      }}
      onClick={handleClick}
    >
      {renderer}
      <FloatingToolBar />
    </Box>
  )
}
