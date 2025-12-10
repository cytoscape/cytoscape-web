import * as React from 'react'
import { Box } from '@mui/material'
import { CustomGraphicsType } from '../../../../../models/VisualStyleModel'
import {
  CustomGraphicsNameType,
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { PieChartRender as PieChartRenderComponent } from './PieChartRender'
import { RingChartRender as RingChartRenderComponent } from './RingChartRender'

/** Read-only render of chart properties */
export function CustomGraphicRender(props: {
  value: CustomGraphicsType
}): React.ReactElement {
  const { value } = props

  // If no custom graphic or it's None type, show empty state
  if (!value || value.name === CustomGraphicsNameType.None) {
    return <Box sx={{ p: 1, textAlign: 'center' }}></Box>
  }

  // Render pie chart
  if (value.name === CustomGraphicsNameType.PieChart) {
    const properties = value.properties as PieChartPropertiesType
    return (
      <Box
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'translate(4px, 12px)',
        }}
      >
        <PieChartRenderComponent
          properties={properties}
          width={60}
          height={60}
          showLabels={true}
        />
      </Box>
    )
  }

  // Render ring chart
  if (value.name === CustomGraphicsNameType.RingChart) {
    const properties = value.properties as RingChartPropertiesType
    return (
      <Box
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'translate(4px, 12px)',
        }}
      >
        <RingChartRenderComponent
          properties={properties}
          width={60}
          height={60}
          showLabels={true}
        />
      </Box>
    )
  }

  // Fallback for other types (like Image in the future)
  return <Box sx={{ p: 1, textAlign: 'center' }}></Box>
}

