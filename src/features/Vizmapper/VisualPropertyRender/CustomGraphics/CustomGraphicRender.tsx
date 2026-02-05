import * as React from 'react'
import { Box } from '@mui/material'
import { CustomGraphicsType } from '../../../../models/VisualStyleModel'
import {
  CustomGraphicsNameType,
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { PieChartRender as PieChartRenderComponent } from './PieChartRender'
import { RingChartRender as RingChartRenderComponent } from './RingChartRender'
import { CHART_CONSTANTS } from './utils/constants'
import { isPieChartProperties, isRingChartProperties } from './utils/typeGuards'

/** Read-only render of chart properties */
export function CustomGraphicRender(props: {
  value: CustomGraphicsType
}): React.ReactElement {
  const { value } = props

  // If no custom graphic or it's None type, show empty state
  if (!value || value.name === CustomGraphicsNameType.None) {
    return <Box sx={{ p: 1, textAlign: 'center' }}></Box>
  }

  // Check if properties exist and are populated (not empty object)
  if (!value.properties || Object.keys(value.properties).length === 0) {
    return <Box sx={{ p: 1, textAlign: 'center' }}></Box>
  }

  // Render pie chart
  if (value.name === CustomGraphicsNameType.PieChart) {
    // Type guard ensures properties is PieChartPropertiesType (not NonePropertiesType)
    if (isPieChartProperties(value.properties)) {
      const pieProperties = value.properties
      // Ensure properties have required fields before rendering
      if (pieProperties.cy_dataColumns && pieProperties.cy_dataColumns.length > 0) {
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <PieChartRenderComponent
              properties={pieProperties}
              size={CHART_CONSTANTS.SIZES.VIEWBOX}
              showLabels={false}
            />
          </Box>
        )
      }
    }
  }

  // Render ring chart
  if (value.name === CustomGraphicsNameType.RingChart) {
    // Type guard ensures properties is RingChartPropertiesType (not NonePropertiesType)
    if (isRingChartProperties(value.properties)) {
      const ringProperties = value.properties
      // Ensure properties have required fields before rendering
      if (ringProperties.cy_dataColumns && ringProperties.cy_dataColumns.length > 0) {
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <RingChartRenderComponent
              properties={ringProperties}
              size={CHART_CONSTANTS.SIZES.VIEWBOX}
              showLabels={false}
            />
          </Box>
        )
      }
    }
  }

  // Fallback for other types (like Image in the future)
  return <Box sx={{ p: 1, textAlign: 'center' }}></Box>
}
