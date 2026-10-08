import { Box, Typography } from '@mui/material'
import * as React from 'react'

import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  ImagePropertiesType,
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { PieChartRender as PieChartRenderComponent } from '../PieChartRender'
import { RingChartRender as RingChartRenderComponent } from '../RingChartRender'
import {
  isImageProperties,
  isPieChartProperties,
  isRingChartProperties,
} from '../utils/typeGuards'
import { CustomGraphicKind } from './SelectTypeStep'

interface CustomGraphicPreviewProps {
  kind: CustomGraphicKind
  properties:
    | PieChartPropertiesType
    | RingChartPropertiesType
    | ImagePropertiesType
  size?: number
  showLabels?: boolean
  sticky?: boolean
  useGrayColors?: boolean
  showIndices?: boolean
}

export const CustomGraphicPreview: React.FC<CustomGraphicPreviewProps> = ({
  kind,
  properties,
  size = 80,
  showLabels = false,
  sticky = false,
  useGrayColors = false,
  showIndices = false,
}) => {
  const [imageError, setImageError] = React.useState(false)

  const imageUrl = isImageProperties(properties) ? properties.url : null

  // Reset error state when URL changes
  React.useEffect(() => {
    setImageError(false)
  }, [imageUrl])

  const hasData = isImageProperties(properties)
    ? properties.url.trim().length > 0
    : properties.cy_dataColumns.length > 0
  const chartTypeName =
    kind === CustomGraphicsNameType.PieChart
      ? 'Pie Chart'
      : kind === CustomGraphicsNameType.RingChart
        ? 'Donut Chart'
        : 'Image'

  // Create modified properties with gray colors if needed
  const modifiedProperties = React.useMemo(() => {
    if (!useGrayColors || isImageProperties(properties)) return properties
    const grayColor = '#CCCCCC' as const
    return {
      ...properties,
      cy_colors: properties.cy_dataColumns.map(() => grayColor),
    }
  }, [properties, useGrayColors])

  const previewBox = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {hasData ? (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: size + 40,
            }}
          >
            {kind === CustomGraphicsNameType.Image &&
            isImageProperties(modifiedProperties) ? (
              imageError ? (
                <Typography variant="body2" color="error">
                  Failed to load image
                </Typography>
              ) : (
                <img
                  src={modifiedProperties.url}
                  alt="Custom Graphic Preview"
                  onError={() => setImageError(true)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: size,
                    objectFit: 'contain',
                  }}
                />
              )
            ) : kind === CustomGraphicsNameType.PieChart &&
              isPieChartProperties(modifiedProperties) ? (
              <PieChartRenderComponent
                properties={modifiedProperties}
                size={size}
                showLabels={showLabels && !showIndices}
                showIndices={showIndices}
              />
            ) : kind === CustomGraphicsNameType.RingChart &&
              isRingChartProperties(modifiedProperties) ? (
              <RingChartRenderComponent
                properties={modifiedProperties}
                size={size}
                showLabels={showLabels && !showIndices}
                showIndices={showIndices}
              />
            ) : null}
          </Box>
          {showLabels && !showIndices && !isImageProperties(properties) && (
            <Typography variant="caption" color="text.secondary">
              {chartTypeName} • {properties.cy_dataColumns.length} slice
              {properties.cy_dataColumns.length !== 1 ? 's' : ''}
            </Typography>
          )}
          {showIndices &&
            !isImageProperties(properties) &&
            properties.cy_dataColumns.length > 0 && (
              <Box sx={{ mt: 2, width: '100%', maxWidth: 280 }}>
                <Box
                  component="ul"
                  sx={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    textAlign: 'left',
                  }}
                >
                  {properties.cy_dataColumns.map((col, index) => (
                    <Box
                      key={index}
                      component="li"
                      sx={{
                        py: 0.5,
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {index + 1}. {col}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
        </>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: size + 40,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {kind === CustomGraphicsNameType.Image
              ? 'Enter a URL to see preview'
              : 'Add attributes to see preview'}
          </Typography>
        </Box>
      )}
    </Box>
  )

  if (sticky) {
    return (
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 2,
          mb: 2,
        }}
      >
        {previewBox}
      </Box>
    )
  }

  return previewBox
}
