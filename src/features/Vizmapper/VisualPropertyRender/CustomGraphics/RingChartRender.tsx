import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { RingChartPropertiesType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

interface RingChartRenderProps {
  properties: RingChartPropertiesType
  size?: number
  width?: number
  height?: number
  showLabels?: boolean
}

/**
 * Renders a preview ring chart based on the provided properties
 */
export const RingChartRender: React.FC<RingChartRenderProps> = ({
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

  const { cy_startAngle, cy_colors, cy_dataColumns, cy_holeSize } = properties

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
  const outerRadius = chartSize / 2 - 8 // Leave more padding for better appearance
  const innerRadius = outerRadius * (cy_holeSize || 0.4) // cy_holeSize is a decimal (0-1), default to 0.4
  const viewBoxSize = 2 * outerRadius // ViewBox should be symmetric around origin

  // Generate SVG path for ring chart slice
  const generateSlicePath = (index: number, color: string) => {
    const startAngle = (cy_startAngle + index * sliceAngle) * (Math.PI / 180)
    const endAngle =
      (cy_startAngle + (index + 1) * sliceAngle) * (Math.PI / 180)

    const x1 = outerRadius * Math.cos(startAngle)
    const y1 = outerRadius * Math.sin(startAngle)
    const x2 = outerRadius * Math.cos(endAngle)
    const y2 = outerRadius * Math.sin(endAngle)

    const x3 = innerRadius * Math.cos(endAngle)
    const y3 = innerRadius * Math.sin(endAngle)
    const x4 = innerRadius * Math.cos(startAngle)
    const y4 = innerRadius * Math.sin(startAngle)

    const largeArcFlag = sliceAngle > 180 ? 1 : 0

    // Create a proper ring slice path
    const path = [
      `M ${x1} ${y1}`, // Start at outer edge
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Outer arc
      `L ${x3} ${y3}`, // Line to inner edge
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`, // Inner arc
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
        viewBox={`${-outerRadius} ${-outerRadius} ${viewBoxSize} ${viewBoxSize}`}
        style={{ transform: 'rotate(-90deg)' }} // Start from 12 o'clock
      >
        <g>
          {cy_dataColumns.map((_col, index) => {
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
