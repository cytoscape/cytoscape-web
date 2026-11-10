import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CustomGraphicsType } from '../../../../../models/VisualStyleModel'
import {
  CustomGraphicsNameType,
  CustomGraphicsTypeType,
  ImagePropertiesType,
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { CHART_CONSTANTS } from '../utils/constants'
import { useCustomGraphicState } from './useCustomGraphicState'

// Switching between compatible chart kinds keeps what both kinds share, as
// Cytoscape Desktop does, so the user does not pick the attributes again.
// See https://github.com/cytoscape/cytoscape-web/issues/954

const pieValue: CustomGraphicsType = {
  type: CustomGraphicsTypeType.Chart,
  name: CustomGraphicsNameType.PieChart,
  properties: {
    cy_range: [1, 16.35887097],
    cy_colorScheme: 'Set3 colors',
    cy_startAngle: 90,
    cy_colors: ['#8DD3C7', '#BEBADA'],
    cy_dataColumns: ['Radiality', 'Degree'],
  },
}

const ringValue: CustomGraphicsType = {
  type: CustomGraphicsTypeType.Chart,
  name: CustomGraphicsNameType.RingChart,
  properties: {
    cy_range: [0, 5],
    cy_colorScheme: 'Dark colors',
    cy_startAngle: 45,
    cy_holeSize: 0.75,
    cy_colors: ['#1B9E77', '#D95F02', '#7570B3'],
    cy_dataColumns: ['gal1RGexp', 'gal4RGexp', 'gal80Rexp'],
  },
}

const imageValue: CustomGraphicsType = {
  type: CustomGraphicsTypeType.Image,
  name: CustomGraphicsNameType.Image,
  properties: { url: 'https://example.com/img.png' },
}

const renderState = (initialValue: CustomGraphicsType | null) =>
  renderHook(() => useCustomGraphicState({ open: true, initialValue }))

describe('useCustomGraphicState kind switching', () => {
  it('keeps attributes, colors, palette and start angle from pie to donut', () => {
    const { result } = renderState(pieValue)

    act(() => result.current.selectKind(CustomGraphicsNameType.RingChart))

    expect(result.current.kind).toBe(CustomGraphicsNameType.RingChart)
    const props = result.current.currentProps as RingChartPropertiesType
    expect(props.cy_dataColumns).toEqual(['Radiality', 'Degree'])
    expect(props.cy_colors).toEqual(['#8DD3C7', '#BEBADA'])
    expect(props.cy_colorScheme).toBe('Set3 colors')
    expect(props.cy_startAngle).toBe(90)
    expect(props.cy_range).toEqual([1, 16.35887097])
    // Donut-only property comes from the donut's own default
    expect(props.cy_holeSize).toBe(CHART_CONSTANTS.DEFAULT_HOLE_SIZE)
  })

  it('keeps shared settings from donut to pie without a hole size', () => {
    const { result } = renderState(ringValue)

    act(() => result.current.selectKind(CustomGraphicsNameType.PieChart))

    const props = result.current.currentProps as PieChartPropertiesType
    expect(props.cy_dataColumns).toEqual([
      'gal1RGexp',
      'gal4RGexp',
      'gal80Rexp',
    ])
    expect(props.cy_colors).toEqual(['#1B9E77', '#D95F02', '#7570B3'])
    expect(props.cy_colorScheme).toBe('Dark colors')
    expect(props.cy_startAngle).toBe(45)
    expect(props).not.toHaveProperty('cy_holeSize')
  })

  it('keeps the donut hole size the user set when switching back', () => {
    const { result } = renderState(ringValue)

    act(() => result.current.handlePropertiesUpdate(45, 0.4))
    act(() => result.current.selectKind(CustomGraphicsNameType.PieChart))
    act(() => result.current.selectKind(CustomGraphicsNameType.RingChart))

    const props = result.current.currentProps as RingChartPropertiesType
    expect(props.cy_holeSize).toBe(0.4)
  })

  it('carries edits made after the switch back to the first kind', () => {
    const { result } = renderState(pieValue)

    act(() => result.current.selectKind(CustomGraphicsNameType.RingChart))
    act(() =>
      result.current.handleAttributesAndColorsUpdate(
        ['Degree'],
        ['#FF0000'],
        'custom',
      ),
    )
    act(() => result.current.handlePropertiesUpdate(180, 0.5))
    act(() => result.current.selectKind(CustomGraphicsNameType.PieChart))

    const props = result.current.currentProps as PieChartPropertiesType
    expect(props.cy_dataColumns).toEqual(['Degree'])
    expect(props.cy_colors).toEqual(['#FF0000'])
    expect(props.cy_colorScheme).toBe('custom')
    expect(props.cy_startAngle).toBe(180)
  })

  it('does not carry chart data into an image, nor image data into a chart', () => {
    const { result } = renderState(imageValue)

    act(() => result.current.selectKind(CustomGraphicsNameType.PieChart))
    const pie = result.current.currentProps as PieChartPropertiesType
    expect(pie.cy_dataColumns).toEqual([])
    expect(pie).not.toHaveProperty('url')

    act(() => result.current.selectKind(CustomGraphicsNameType.Image))
    const image = result.current.currentProps as ImagePropertiesType
    expect(image.url).toBe('https://example.com/img.png')
    expect(image).not.toHaveProperty('cy_dataColumns')
  })

  it('does not share array references between kinds', () => {
    const { result } = renderState(pieValue)
    const pieColumns = (result.current.currentProps as PieChartPropertiesType)
      .cy_dataColumns

    act(() => result.current.selectKind(CustomGraphicsNameType.RingChart))

    const ring = result.current.currentProps as RingChartPropertiesType
    expect(ring.cy_dataColumns).not.toBe(pieColumns)
  })
})
