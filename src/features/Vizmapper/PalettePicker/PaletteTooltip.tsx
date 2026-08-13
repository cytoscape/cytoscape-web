import { Box, Tooltip, Typography } from '@mui/material'
import * as React from 'react'

import { PaletteDefinition } from '@/models/VisualStyleModel/VisualPropertyValue/ColorPalette'

interface PaletteTooltipProps {
  palette: PaletteDefinition
  /** Must accept a ref — MUI's Tooltip attaches its listeners to it. */
  children: React.ReactElement
  placement?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * The hover card for a palette: its name, what it is for, and whether it is
 * colorblind-safe. Shared so every picker describes a palette the same way.
 */
export function PaletteTooltip({
  palette,
  children,
  placement = 'right',
}: PaletteTooltipProps): React.ReactElement {
  return (
    <Tooltip
      placement={placement}
      title={
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {palette.metadata.name}
          </Typography>
          {palette.metadata.description != null && (
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              {palette.metadata.description}
            </Typography>
          )}
          <Typography variant="caption" sx={{ display: 'block' }}>
            Category: {palette.metadata.category}
          </Typography>
          {palette.metadata.colorBlindSafe === true && (
            <Typography
              variant="caption"
              sx={{ display: 'block', color: 'success.main' }}
            >
              Colorblind-safe
            </Typography>
          )}
        </Box>
      }
    >
      {children}
    </Tooltip>
  )
}
