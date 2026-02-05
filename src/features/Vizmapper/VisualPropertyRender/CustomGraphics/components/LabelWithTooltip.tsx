import * as React from 'react'
import { Box, Typography, Tooltip } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

interface LabelWithTooltipProps {
  label: string
  tooltip: string
}

/**
 * Reusable label with tooltip pattern used in forms
 */
export const LabelWithTooltip: React.FC<LabelWithTooltipProps> = ({
  label,
  tooltip,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="subtitle2">{label}</Typography>
      <Tooltip title={tooltip}>
        <InfoOutlinedIcon fontSize="small" color="action" />
      </Tooltip>
    </Box>
  )
}

