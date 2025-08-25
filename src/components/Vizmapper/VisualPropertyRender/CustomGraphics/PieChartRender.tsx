import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { PieChartPropertiesType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

interface PieChartRenderProps {
  properties: PieChartPropertiesType
  size?: number
  width?: number
  height?: number
  showLabels?: boolean
}

/**
 * Renders a preview pie chart based on the provided properties
 */
export const PieChartRender: React.FC<PieChartRenderProps> = ({
  properties,
  size,
  width,
  height,
  showLabels = false,
}) => {
  // Use size if provided, otherwise use width/height
  const chartSize = size || Math.min(width || 120, height || 120)
  const containerWidth = width || chartSize
  const containerHeight = height || (showLabels ? chartSize + 20 : chartSize)

  const { cy_startAngle, cy_colors, cy_dataColumns } = properties

  // If no data columns, show empty state
  if (!cy_dataColumns.length) {
    return (
      <Box
        sx={{
          width: containerWidth,
          height: containerHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: chartSize,
            height: chartSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed',
            borderColor: 'grey.300',
            borderRadius: '50%',
            bgcolor: 'grey.50',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            No data
          </Typography>
        </Box>
      </Box>
    )
  }

  // Calculate slice angles (equal distribution for preview)
  const sliceAngle = 360 / cy_dataColumns.length
  const radius = chartSize / 2 - 8 // Leave more padding for better appearance

  // Generate SVG path for pie chart slice
  const generateSlicePath = (index: number, color: string) => {
    const startAngle = (cy_startAngle + index * sliceAngle) * (Math.PI / 180)
    const endAngle =
      (cy_startAngle + (index + 1) * sliceAngle) * (Math.PI / 180)

    const x1 = radius * Math.cos(startAngle)
    const y1 = radius * Math.sin(startAngle)
    const x2 = radius * Math.cos(endAngle)
    const y2 = radius * Math.sin(endAngle)

    const largeArcFlag = sliceAngle > 180 ? 1 : 0

    // Create a proper pie slice path
    const path = [
      `M 0 0`, // Start at center
      `L ${x1} ${y1}`, // Line to start of arc
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arc to end
      'Z', // Close path
    ].join(' ')

    return (
      <path
        key={index}
        d={path}
        fill={color}
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    )
  }

  return (
    <Box
      sx={{
        width: containerWidth,
        height: containerHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={chartSize}
        height={chartSize}
        viewBox={`${-radius} ${-radius} ${chartSize} ${chartSize}`}
        style={{ transform: 'rotate(-90deg)' }} // Start from 12 o'clock
      >
        <g>
          {cy_dataColumns.map((_, index) => {
            const color = cy_colors[index] || '#CCCCCC'
            // Reverse the render order to match Cytoscape.js
            const reversedIndex = cy_dataColumns.length - 1 - index
            return generateSlicePath(reversedIndex, color)
          })}
        </g>
      </svg>

      {showLabels && (
        <Box
          sx={{
            textAlign: 'center',
            mt: 1,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 'medium' }}
          >
            {cy_dataColumns.length} slice
            {cy_dataColumns.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
