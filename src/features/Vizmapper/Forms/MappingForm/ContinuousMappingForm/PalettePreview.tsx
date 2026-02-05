import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { PaletteDefinition } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorPalette'
import AccessibilityIcon from '@mui/icons-material/Accessibility'

interface PalettePreviewProps {
  palette: PaletteDefinition
  width?: number
  height?: number
  orientation?: 'horizontal' | 'vertical'
  showMetadata?: boolean
}

/**
 * React component to render a color palette preview with metadata
 * Replaces the need for palette image files
 */
export function PalettePreview({
  palette,
  width = 15,
  height = 150,
  orientation = 'vertical',
  showMetadata = false,
}: PalettePreviewProps): React.ReactElement {
  const isVertical = orientation === 'vertical'
  const numColors = palette.colors.length

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          width: isVertical ? width : width * numColors,
          height: isVertical ? height : height,
          overflow: 'hidden',
          borderRadius: 0.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {palette.colors.map((color, index) => (
          <Box
            key={index}
            sx={{
              backgroundColor: color,
              flex: 1,
              minWidth: isVertical ? '100%' : width,
              minHeight: isVertical ? height / numColors : '100%',
            }}
          />
        ))}
      </Box>
      {showMetadata && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
            width: '100%',
            maxWidth: width + 20,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              textAlign: 'center',
              fontWeight: 'medium',
              lineHeight: 1.2,
            }}
          >
            {palette.metadata.name}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {palette.metadata.colorBlindSafe !== false && (
              <Chip
                icon={
                  <AccessibilityIcon sx={{ fontSize: '0.75rem !important' }} />
                }
                label="Safe"
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  '& .MuiChip-icon': {
                    fontSize: '0.75rem',
                  },
                }}
                color="success"
                variant="outlined"
              />
            )}
            {palette.min && palette.middle && palette.max && (
              <Chip
                label="Diverging"
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                }}
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
