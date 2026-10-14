import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Box, Tooltip, Typography } from '@mui/material'
import * as React from 'react'

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
