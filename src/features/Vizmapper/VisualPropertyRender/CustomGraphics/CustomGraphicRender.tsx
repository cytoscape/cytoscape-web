import { Box } from '@mui/material'
import * as React from 'react'

import { CustomGraphicsType } from '../../../../models/VisualStyleModel'
import {
  CustomGraphicsNameType,
  isImageCustomGraphicsName,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { PieChartRender as PieChartRenderComponent } from './PieChartRender'
import { RingChartRender as RingChartRenderComponent } from './RingChartRender'
import { CHART_CONSTANTS } from './utils/constants'
import {
  isImageProperties,
  isPieChartProperties,
  isRingChartProperties,
} from './utils/typeGuards'

/** Small helper that renders an image with error handling */
function ImageRender({ url }: { url: string }): React.ReactElement {
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [url])

  if (hasError) {
    return <Box sx={{ p: 1, textAlign: 'center' }}></Box>
  }

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
      <img
        src={url}
        alt="Custom Graphic"
        onError={() => setHasError(true)}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </Box>
  )
}

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
      if (
        pieProperties.cy_dataColumns &&
        pieProperties.cy_dataColumns.length > 0
      ) {
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
      if (
        ringProperties.cy_dataColumns &&
        ringProperties.cy_dataColumns.length > 0
      ) {
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

  // Render image (raster or SVG)
  if (isImageCustomGraphicsName(value.name)) {
    if (isImageProperties(value.properties)) {
      const imageProperties = value.properties
      if (imageProperties.url && imageProperties.url.trim().length > 0) {
        return <ImageRender url={imageProperties.url} />
      }
    }
  }

  // Fallback for other types
  return <Box sx={{ p: 1, textAlign: 'center' }}></Box>
}
