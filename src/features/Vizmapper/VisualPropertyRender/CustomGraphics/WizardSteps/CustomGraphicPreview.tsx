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
  const previewBox = (
      <Box
        sx={{
          border: `1px solid ${COLORS.BORDER}`,
          borderRadius: 1,
          bgcolor: '#fafafa',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
      <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
        Custom Graphic Preview
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        {kind === CustomGraphicsNameType.PieChart && isPieChartProperties(properties) ? (
          <PieChartRenderComponent
            properties={properties}
            size={size}
            showLabels={showLabels}
          />
        ) : kind === CustomGraphicsNameType.RingChart && isRingChartProperties(properties) ? (
          <RingChartRenderComponent
            properties={properties}
            size={size}
            showLabels={showLabels}
          />
        ) : null}
      </Box>
    </Box>
  )

  if (sticky) {
    return (
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'white',
          borderBottom: `1px solid ${COLORS.BORDER}`,
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

