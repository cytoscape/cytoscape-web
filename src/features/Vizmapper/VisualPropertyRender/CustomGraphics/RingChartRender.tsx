import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { RingChartPropertiesType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  calculateChartDimensions,
  calculateRadii,
  calculateSliceAngle,
  degreesToRadians,
} from './utils/chartRenderUtils'
import { CHART_CONSTANTS, COLORS, STYLES } from './utils/constants'
import { EmptyChartState } from './WizardSteps/EmptyChartState'

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
  const { chartSize, containerWidth, containerHeight } =
    calculateChartDimensions(size, width, height)
  const adjustedContainerHeight = showLabels
    ? containerHeight + 20
    : containerHeight

  const { cy_startAngle, cy_colors, cy_dataColumns, cy_holeSize } = properties

  // If no data columns, show empty state
  if (!cy_dataColumns.length) {
    return (
      <EmptyChartState
        size={chartSize}
        containerWidth={containerWidth}
        containerHeight={adjustedContainerHeight}
      />
    )
  }

  // Calculate slice angles (equal distribution for preview)
  const sliceAngle = calculateSliceAngle(cy_dataColumns.length)
  const { outerRadius, innerRadius, viewBoxSize } = calculateRadii(
    chartSize,
    cy_holeSize ?? CHART_CONSTANTS.DEFAULT_HOLE_SIZE,
  )

  // Remove stroke for preview charts to prevent gaps (only use stroke for very large charts)
  const useStroke = chartSize > 120

  // Generate SVG path for ring chart slice
  const generateSlicePath = React.useCallback(
    (index: number, color: string) => {
      if (innerRadius === undefined) return null

      const startAngleRad = degreesToRadians(cy_startAngle + index * sliceAngle)
      const endAngleRad = degreesToRadians(
        cy_startAngle + (index + 1) * sliceAngle,
      )

      const x1 = outerRadius * Math.cos(startAngleRad)
      const y1 = outerRadius * Math.sin(startAngleRad)
      const x2 = outerRadius * Math.cos(endAngleRad)
      const y2 = outerRadius * Math.sin(endAngleRad)

      const x3 = innerRadius * Math.cos(endAngleRad)
      const y3 = innerRadius * Math.sin(endAngleRad)
      const x4 = innerRadius * Math.cos(startAngleRad)
      const y4 = innerRadius * Math.sin(startAngleRad)

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
          {...(useStroke && {
            stroke: STYLES.STROKE_COLOR,
            strokeWidth: STYLES.STROKE_WIDTH,
            strokeLinejoin: 'round',
          })}
        />
      )
    },
    [cy_startAngle, sliceAngle, outerRadius, innerRadius, useStroke],
  )

  return (
    <Box
      sx={{
        width: containerWidth,
        height: adjustedContainerHeight,
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
        style={{
          transform: `rotate(${STYLES.ROTATION}deg)`,
          display: 'block',
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <g>
          {cy_dataColumns.map((_col, index) => {
            const color = cy_colors[index] || COLORS.DEFAULT
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
