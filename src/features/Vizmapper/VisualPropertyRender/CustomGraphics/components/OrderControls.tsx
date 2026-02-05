import * as React from 'react'
import { Box, IconButton } from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

interface OrderControlsProps {
  order: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  disabled?: boolean
}

/**
 * Reusable order controls (badge + up/down arrows) used in AttributesForm
 */
export const OrderControls: React.FC<OrderControlsProps> = ({
  order,
  total,
  onMoveUp,
  onMoveDown,
  disabled = false,
}) => {
  const isDisabled = disabled || total <= 1

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: '50%',
          bgcolor: 'grey.200',
          color: 'text.secondary',
          fontSize: '0.7rem',
          fontWeight: 'medium',
        }}
      >
        {order}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <IconButton
          size="small"
          onClick={onMoveUp}
          disabled={isDisabled}
          sx={{ p: 0.25, minWidth: 20, height: 16 }}
        >
          <ArrowUpwardIcon sx={{ fontSize: 12 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={onMoveDown}
          disabled={isDisabled}
          sx={{ p: 0.25, minWidth: 20, height: 16 }}
        >
          <ArrowDownwardIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </Box>
    </Box>
  )
}

