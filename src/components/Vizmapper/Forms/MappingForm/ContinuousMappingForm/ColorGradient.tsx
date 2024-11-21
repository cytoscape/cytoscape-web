import * as React from 'react'
import { Box } from '@mui/material'
import { color } from 'd3-color'
import { AxisBottom } from '@visx/axis'
import { ScaleLinear } from 'd3-scale'
import { ContinuousMappingFunction, ValueType } from 'src/models'
import { getMapper } from '../../../../../models/VisualStyleModel/impl/MapperFactory'

export interface ColorGradiientProps {
  numSteps: number
  stepWidth: number
  height: number
  domainLabel: string
  axisOffsetLeft: number
  horizontalPadding: number
  verticalPadding: number
  valuePixelScale: ScaleLinear<number, number>
  colorScale: ScaleLinear<string, string>
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
    colorScale,
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
            }}
            label={domainLabel}
            stroke={'#1b1a1e'}
          />
        </svg>
      </Box>
    </Box>
  )
}
