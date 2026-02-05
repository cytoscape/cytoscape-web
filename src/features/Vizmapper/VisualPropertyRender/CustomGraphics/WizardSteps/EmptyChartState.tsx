import * as React from 'react'
import { Box, Typography } from '@mui/material'

interface EmptyChartStateProps {
  size: number
  containerWidth: number
  containerHeight: number
}

/**
 * Shared empty state component for charts when no data is available
 */
export const EmptyChartState: React.FC<EmptyChartStateProps> = ({
  size,
  containerWidth,
  containerHeight,
}) => {
  return (
    <Box
      sx={{
        width: containerWidth,
        height: containerHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed',
          borderColor: 'grey.300',
          borderRadius: '50%',
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          No data
        </Typography>
      </Box>
    </Box>
  )
}

