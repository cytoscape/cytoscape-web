import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { PieChartRender as PieChartRenderComponent } from '../PieChartRender'
import { RingChartRender as RingChartRenderComponent } from '../RingChartRender'

export type ChartKind =
  | typeof CustomGraphicsNameType.PieChart
  | typeof CustomGraphicsNameType.RingChart

interface ChartPreviewProps {
  kind: ChartKind
  properties: PieChartPropertiesType | RingChartPropertiesType
  size?: number
  showLabels?: boolean
  sticky?: boolean
}

export const ChartPreview: React.FC<ChartPreviewProps> = ({
  kind,
  properties,
  size = 80,
  showLabels = false,
  sticky = false,
}) => {
  const previewBox = (
    <Box
      sx={{
        border: '1px solid #e0e0e0',
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
        Chart Preview
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        {kind === CustomGraphicsNameType.PieChart ? (
          <PieChartRenderComponent
            properties={properties as PieChartPropertiesType}
            size={size}
            showLabels={showLabels}
          />
        ) : (
          <RingChartRenderComponent
            properties={properties as RingChartPropertiesType}
            size={size}
            showLabels={showLabels}
          />
        )}
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
          borderBottom: '1px solid #e0e0e0',
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
