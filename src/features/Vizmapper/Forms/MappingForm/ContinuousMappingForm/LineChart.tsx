import { AxisBottom, AxisLeft } from '@visx/axis'
import { LinearGradient } from '@visx/gradient'
import { Group } from '@visx/group'
import { scaleLinear as visXScaleLinear } from '@visx/scale'
import { AreaClosed, LinePath } from '@visx/shape'
import { extent } from 'd3-array'
import * as React from 'react'

export interface LineChartProps {
  width: number
  height: number
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
  labelColor?: string
  strokeColor?: string
  data: Array<[number, number]>
  domain: number[]
  range: number[]
  domainLabel: string
  rangeLabel: string
}

export function LineChart(props: LineChartProps): React.ReactElement {
  const {
    width,
    height,
    margin,
    labelColor = 'rgba(0, 0, 0, 0.7)',
    strokeColor = 'rgba(0, 0, 0, 0.7)',
    data,
    domain,
    range,
    domainLabel,
    rangeLabel,
  } = props

  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xGetter = (d: [number, number]): number => d[0]
  const yGetter = (d: [number, number]): number => d[1]

  const valueDomainExtent = extent(domain)
  const vpValueDomainExtent = extent(range)
  const xScale = visXScaleLinear({
    range: [0, xMax],
    domain: valueDomainExtent as [number, number],
  })

  const yScale = visXScaleLinear({
    range: [yMax, 0],
    domain: vpValueDomainExtent as [number, number],
  })

  const xMapper = (d: [number, number]): number => xScale(xGetter(d)) ?? 0
  const yMapper = (d: [number, number]): number => yScale(yGetter(d)) ?? 0

  return (
    <svg width={width} height={height}>
      <Group top={margin.top} left={margin.left}>
        <AxisLeft
          scale={yScale}
          top={0}
          left={0}
          numTicks={7}
          label={rangeLabel}
          labelProps={{
            fontSize: 14,
            textAnchor: 'middle',
            fill: labelColor,
          }}
          labelOffset={25}
          stroke={strokeColor}
          tickStroke={strokeColor}
          tickLabelProps={() => ({
            fill: labelColor,
            fontSize: 10,
            textAnchor: 'end',
            verticalAnchor: 'middle',
            dx: -4,
          })}
        />
        <AxisBottom
          scale={xScale}
          top={yMax}
          numTicks={7}
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
        <LinePath
          data={data}
          stroke={'url(#gradient)'}
          x={xMapper}
          y={yMapper}
        />
        <AreaClosed
          data={data}
          fill={'url(#gradient)'}
          yScale={yScale}
          x={xMapper}
          y={yMapper}
        />
        <LinearGradient from="#63a5e8" to="#a6c9ed" id="gradient" />
      </Group>
    </svg>
  )
}
