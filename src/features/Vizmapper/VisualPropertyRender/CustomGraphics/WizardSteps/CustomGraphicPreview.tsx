import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { PieChartRender as PieChartRenderComponent } from '../PieChartRender'
import { RingChartRender as RingChartRenderComponent } from '../RingChartRender'
import { CustomGraphicKind } from './SelectTypeStep'
import { CHART_CONSTANTS, COLORS } from '../utils/constants'
import {
  isPieChartProperties,
  isRingChartProperties,
} from '../utils/typeGuards'

interface CustomGraphicPreviewProps {
  kind: CustomGraphicKind
  properties: PieChartPropertiesType | RingChartPropertiesType
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
  const hasData = properties.cy_dataColumns.length > 0
  const chartTypeName =
    kind === CustomGraphicsNameType.PieChart ? 'Pie Chart' : 'Donut Chart'

  // Create modified properties with gray colors if needed
  const modifiedProperties = React.useMemo(() => {
    if (!useGrayColors) return properties
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
            {kind === CustomGraphicsNameType.PieChart &&
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
          {showLabels && !showIndices && (
            <Typography variant="caption" color="text.secondary">
              {chartTypeName} • {properties.cy_dataColumns.length} slice
              {properties.cy_dataColumns.length !== 1 ? 's' : ''}
            </Typography>
          )}
          {showIndices && properties.cy_dataColumns.length > 0 && (
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
            Add attributes to see preview
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
