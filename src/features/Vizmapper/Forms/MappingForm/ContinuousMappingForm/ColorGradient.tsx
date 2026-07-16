import { Box } from '@mui/material'
import { AxisBottom } from '@visx/axis'
import { color } from 'd3-color'
import { ScaleLinear } from 'd3-scale'
import * as React from 'react'
import { ContinuousMappingFunction, ValueType } from 'src/models'

import { getMapper } from '../../../../../models/VisualStyleModel/impl/mapperFactory'

export interface ColorGradiientProps {
  numSteps: number
  stepWidth: number
  height: number
  domainLabel: string
  axisOffsetLeft: number
  horizontalPadding: number
  verticalPadding: number
  valuePixelScale: ScaleLinear<number, number>
  labelColor?: string
  strokeColor?: string
  cm: ContinuousMappingFunction
}

export function ColorGradient(props: ColorGradiientProps): React.ReactElement {
  const {
    numSteps,
    stepWidth,
    height,
    axisOffsetLeft,
    domainLabel,
    horizontalPadding,
    verticalPadding,
    valuePixelScale,
    labelColor = 'rgba(0, 0, 0, 0.7)',
    strokeColor = 'rgba(0, 0, 0, 0.7)',
    cm,
  } = props

  const mapper = getMapper(cm)

  return (
    <Box sx={{ display: 'flex' }}>
      {Array(numSteps)
        .fill(0)
        .map((_, i) => {
          const value = valuePixelScale.invert(i * stepWidth)
          const stepColor =
            color(mapper(value as ValueType) as string)?.formatHex() ??
            '#000000'

          return (
            <Box
              key={i}
              sx={{
                width: stepWidth,
                height,
                backgroundColor: stepColor,
              }}
            ></Box>
          )
        })}
      <Box
        sx={{
          position: 'absolute',
          left: -axisOffsetLeft,
        }}
      >
        <svg
          width={horizontalPadding + numSteps * stepWidth}
          height={verticalPadding + height}
        >
          <AxisBottom
            scale={valuePixelScale}
            left={axisOffsetLeft}
            top={height}
            labelProps={{
              fontSize: 14,
              textAnchor: 'middle',
              fill: labelColor,
            }}
            label={domainLabel}
            stroke={strokeColor}
            tickStroke={strokeColor}
            tickLabelProps={() => ({
              fill: labelColor,
              fontSize: 10,
              textAnchor: 'middle',
              verticalAnchor: 'end',
              dy: 2,
            })}
          />
        </svg>
      </Box>
    </Box>
  )
}
