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
import { isPieChartProperties, isRingChartProperties } from '../utils/typeGuards'

interface CustomGraphicPreviewProps {
  kind: CustomGraphicKind
  properties: PieChartPropertiesType | RingChartPropertiesType
  size?: number
  showLabels?: boolean
  sticky?: boolean
}

export const CustomGraphicPreview: React.FC<CustomGraphicPreviewProps> = ({
  kind,
  properties,
  size = 80,
  showLabels = false,
  sticky = false,
}) => {
  const hasData = properties.cy_dataColumns.length > 0
  const chartTypeName =
    kind === CustomGraphicsNameType.PieChart ? 'Pie Chart' : 'Donut Chart'

  const previewBox = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        Preview
      </Typography>
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
            isPieChartProperties(properties) ? (
              <PieChartRenderComponent
                properties={properties}
                size={size}
                showLabels={showLabels}
              />
            ) : kind === CustomGraphicsNameType.RingChart &&
              isRingChartProperties(properties) ? (
              <RingChartRenderComponent
                properties={properties}
                size={size}
                showLabels={showLabels}
              />
            ) : null}
          </Box>
          {showLabels && (
            <Typography variant="caption" color="text.secondary">
              {chartTypeName} • {properties.cy_dataColumns.length} slice
              {properties.cy_dataColumns.length !== 1 ? 's' : ''}
            </Typography>
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

