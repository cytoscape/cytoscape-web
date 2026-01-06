import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { PieChartPropertiesType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  calculateChartDimensions,
  calculateRadii,
  calculateSliceAngle,
  degreesToRadians,
} from './utils/chartRenderUtils'
import { CHART_CONSTANTS, COLORS, STYLES } from './utils/constants'
import { EmptyChartState } from './WizardSteps/EmptyChartState'

interface PieChartRenderProps {
  properties: PieChartPropertiesType
  size?: number
  width?: number
  height?: number
  showLabels?: boolean
  showIndices?: boolean
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
  showIndices = false,
}) => {
  const { chartSize, containerWidth, containerHeight } =
    calculateChartDimensions(size, width, height)
  const adjustedContainerHeight = showLabels
    ? containerHeight + 20
    : containerHeight

  const { cy_startAngle, cy_colors, cy_dataColumns } = properties

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
  const { outerRadius, viewBoxSize } = calculateRadii(chartSize)

  // Convert start angle to match Cytoscape.js coordinate system
  // Cytoscape uses: (90 - angle) % 360, where 90deg = 12 o'clock
  // We need to apply the same conversion for alignment
  const cytoscapeStartAngle = ((90 - cy_startAngle) % 360 + 360) % 360

  // Remove stroke for preview charts to prevent gaps (only use stroke for very large charts)
  const useStroke = chartSize > 120

  // Generate SVG path for pie chart slice
  const generateSlicePath = React.useCallback(
    (index: number, color: string) => {
      const startAngleRad = degreesToRadians(cytoscapeStartAngle + index * sliceAngle)
      const endAngleRad = degreesToRadians(
        cytoscapeStartAngle + (index + 1) * sliceAngle,
      )

      const x1 = outerRadius * Math.cos(startAngleRad)
      const y1 = outerRadius * Math.sin(startAngleRad)
      const x2 = outerRadius * Math.cos(endAngleRad)
      const y2 = outerRadius * Math.sin(endAngleRad)

      const largeArcFlag = sliceAngle > 180 ? 1 : 0

      // Create a proper pie slice path
      const path = [
        `M 0 0`, // Start at center
        `L ${x1} ${y1}`, // Line to start of arc
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arc to end
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
    [cytoscapeStartAngle, sliceAngle, outerRadius, useStroke],
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
          display: 'block',
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <g>
          {cy_dataColumns.map((_col, index) => {
            const color = cy_colors[index] || COLORS.DEFAULT
            // Reverse the render order to match Cytoscape.js
            const reversedIndex = cy_dataColumns.length - 1 - index
            const slicePath = generateSlicePath(reversedIndex, color)
            
            // Add index label if needed
            if (showIndices) {
              const currentSliceAngle = calculateSliceAngle(cy_dataColumns.length)
              const sliceAngleRad = degreesToRadians(cytoscapeStartAngle + reversedIndex * currentSliceAngle + currentSliceAngle / 2)
              const labelRadius = outerRadius * 0.6
              const labelX = labelRadius * Math.cos(sliceAngleRad)
              const labelY = labelRadius * Math.sin(sliceAngleRad)
              
              return (
                <g key={index}>
                  {slicePath}
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000000"
                    fontSize={chartSize > 150 ? 14 : chartSize > 100 ? 12 : 10}
                    fontWeight="bold"
                    transform={`rotate(0 ${labelX} ${labelY})`}
                  >
                    {index + 1}
                  </text>
                </g>
              )
            }
            
            return slicePath
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
