
import { describe, expect, it } from 'vitest'

import type { AttributeName, ValueType } from '../../TableModel'
import type { LineChartPropertiesType } from '../VisualPropertyValue/CustomGraphicsType'
import { buildLineChartSvg } from './lineChartSvg'

describe('buildLineChartSvg', () => {
  const properties: LineChartPropertiesType = {
    cy_dataColumns: ['sampleA', 'sampleB', 'sampleC'] as AttributeName[],
    cy_colors: ['#8DD3C7', '#FFFFB3', '#BEBADA'],
    cy_range: [-1, 1],
    cy_lineWidth: 2,
    cy_showDomainAxis: true,
    cy_showRangeAxis: true,
    cy_axisColor: '#41AB5D',
    cy_axisWidth: 0.3,
    cy_showRangeZeroBaseline: true,
  }

  it('creates an SVG containing the line and configured axes', () => {
    const svg = buildLineChartSvg(properties, {
      sampleA: -0.5,
      sampleB: 0.25,
      sampleC: 0.75,
    })

    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('stroke="#41AB5D"')
    expect(svg).toContain('stroke-width="2"')
    expect(svg).toContain('<polyline')
    expect(svg).toContain('points="')
    expect(svg.match(/<polyline/g)).toHaveLength(1)
    expect(svg).toContain('stroke="#8DD3C7"')
  })

  it('omits axes when they are disabled', () => {
    const svg = buildLineChartSvg(
      {
        ...properties,
        cy_showDomainAxis: false,
        cy_showRangeAxis: false,
        cy_showRangeZeroBaseline: false,
      },
      {
        sampleA: -0.5,
        sampleB: 0.25,
        sampleC: 0.75,
      },
    )

    expect(svg).not.toContain('<line')
    expect(svg).toContain('<polyline')
  })

  it('draws the zero baseline when enabled and zero is in range', () => {
    const svg = buildLineChartSvg(properties, {
      sampleA: -0.5,
      sampleB: 0.25,
      sampleC: 0.75,
    })

    expect(svg).toContain('stroke-dasharray="2 2"')
  })

  it('does not draw a zero baseline when zero is outside the range', () => {
    const svg = buildLineChartSvg(
      {
        ...properties,
        cy_range: [2, 5],
      },
      {
        sampleA: 2.5,
        sampleB: 3.5,
        sampleC: 4.5,
      },
    )

    expect(svg).not.toContain('stroke-dasharray="2 2"')
  })

  it('does not generate NaN coordinates for missing or nonnumeric values', () => {
    const row: Record<AttributeName, ValueType | null> = {
      sampleA: 1,
      sampleB: null,
      sampleC: 'not-a-number',
    } as Record<AttributeName, ValueType | null>

    const svg = buildLineChartSvg(properties, row)

    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
  })

  it('returns valid SVG when all values are missing', () => {
    const svg = buildLineChartSvg(properties, {})

    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).not.toContain('<polyline')
    expect(svg).not.toContain('NaN')
  })
  it('draws the configured chart border', () => {
  const svg = buildLineChartSvg(
    {
      ...properties,
      cy_borderWidth: 0.3,
      cy_borderColor: '#016450',
    },
    {
      sampleA: -0.5,
      sampleB: 0.25,
      sampleC: 0.75,
    },
  )

  expect(svg).toContain('stroke="#016450"')
  })
  it('renders axis labels using the configured font size and domain label position', () => {
  const svg = buildLineChartSvg(
    {
      ...properties,
      cy_axisLabelFontSize: 2,
      cy_domainLabelPosition: 'DOWN_45',
    },
    {
      sampleA: -0.5,
      sampleB: 0.25,
      sampleC: 0.75,
    },
  )

  expect(svg).toContain('font-size="2"')
  expect(svg).toContain('rotate(45')
  })
})
