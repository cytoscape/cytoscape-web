import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { PieChartRender } from './PieChartRender'
import { RingChartRender } from './RingChartRender'

// Cytoscape Desktop omits cy_startAngle when it is at its default, so a chart
// read from a CX2 may have none (#842). The icons must draw from 0°, as the
// network canvas does, instead of producing NaN path coordinates.

const pieWithoutStartAngle: PieChartPropertiesType = {
  cy_range: [0, 1],
  cy_colorScheme: '',
  cy_colors: ['#FF0000', '#00FF00'],
  cy_dataColumns: ['Radiality', 'Degree'],
}

const ringWithoutStartAngle: RingChartPropertiesType = {
  ...pieWithoutStartAngle,
  cy_holeSize: 0.4,
}

const pathData = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll('path')).map(
    (p) => p.getAttribute('d') ?? '',
  )

describe('chart icons without a start angle (#842)', () => {
  it('PieChartRender draws every slice with finite coordinates', () => {
    const { container } = render(
      <PieChartRender properties={pieWithoutStartAngle} size={24} />,
    )
    const paths = pathData(container)
    expect(paths).toHaveLength(2)
    paths.forEach((d) => expect(d).not.toContain('NaN'))
  })

  it('RingChartRender draws every slice with finite coordinates', () => {
    const { container } = render(
      <RingChartRender properties={ringWithoutStartAngle} size={24} />,
    )
    const paths = pathData(container)
    expect(paths).toHaveLength(2)
    paths.forEach((d) => expect(d).not.toContain('NaN'))
  })

  it('a missing start angle draws the same icon as 0°', () => {
    const missing = render(
      <PieChartRender properties={pieWithoutStartAngle} size={24} />,
    )
    const zero = render(
      <PieChartRender
        properties={{ ...pieWithoutStartAngle, cy_startAngle: 0 }}
        size={24}
      />,
    )
    expect(pathData(missing.container)).toEqual(pathData(zero.container))
  })

  it('an explicit start angle still rotates the ring', () => {
    const at0 = render(
      <RingChartRender
        properties={{ ...ringWithoutStartAngle, cy_startAngle: 0 }}
        size={24}
      />,
    )
    const at45 = render(
      <RingChartRender
        properties={{ ...ringWithoutStartAngle, cy_startAngle: 45 }}
        size={24}
      />,
    )
    expect(pathData(at45.container)).not.toEqual(pathData(at0.container))
  })
})
