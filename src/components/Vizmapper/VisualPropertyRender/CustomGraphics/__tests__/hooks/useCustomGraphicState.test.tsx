import * as React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useCustomGraphicState } from '../../hooks/useCustomGraphicState'
import { CustomGraphicsNameType } from '../../../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  mockCustomGraphics,
  mockPieChartProperties,
  mockRingChartProperties,
} from '../../__tests__/testUtils'

// Mock the utility functions
jest.mock('../../utils/palettes', () => ({
  PALETTES: {
    Sequential1: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
    Diverging1: ['#FF0000', '#00FF00', '#0000FF'],
  },
}))

jest.mock('../../utils/colorUtils', () => ({
  pickEvenly: jest.fn((colors, count) => colors.slice(0, count)),
}))

describe('useCustomGraphicState', () => {
  const defaultProps = {
    open: true,
    initialValue: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with default values when no initial value', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    expect(result.current.currentStep).toBe(0) // SelectType
    expect(result.current.kind).toBe(CustomGraphicsNameType.PieChart)
    expect(result.current.currentProps.cy_dataColumns).toEqual([])
    expect(result.current.currentProps.cy_colors).toEqual([])
    expect(result.current.currentProps.cy_startAngle).toBe(0)
  })

  it('initializes with existing pie chart values', () => {
    const props = {
      ...defaultProps,
      initialValue: {
        ...mockCustomGraphics,
        name: CustomGraphicsNameType.PieChart,
        properties: mockPieChartProperties,
      },
    }

    const { result } = renderHook(() => useCustomGraphicState(props))

    expect(result.current.currentStep).toBe(4) // Preview
    expect(result.current.kind).toBe(CustomGraphicsNameType.PieChart)
    expect(result.current.currentProps.cy_dataColumns).toEqual([
      'attribute1',
      'attribute2',
      'attribute3',
    ])
    expect(result.current.currentProps.cy_colors).toEqual([
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
    ])
  })

  it('initializes with existing ring chart values', () => {
    const props = {
      ...defaultProps,
      initialValue: {
        ...mockCustomGraphics,
        name: CustomGraphicsNameType.RingChart,
        properties: mockRingChartProperties,
      },
    }

    const { result } = renderHook(() => useCustomGraphicState(props))

    expect(result.current.currentStep).toBe(4) // Preview
    expect(result.current.kind).toBe(CustomGraphicsNameType.RingChart)
    expect(result.current.currentProps.cy_startAngle).toBe(90)
    expect((result.current.currentProps as any).cy_holeSize).toBe(0.4)
  })

  it('handles chart kind changes', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    act(() => {
      result.current.setKind(CustomGraphicsNameType.RingChart)
    })

    expect(result.current.kind).toBe(CustomGraphicsNameType.RingChart)
  })

  it('handles step navigation', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    act(() => {
      result.current.goToNextStep()
    })

    expect(result.current.currentStep).toBe(1) // SelectAttributes

    act(() => {
      result.current.goToNextStep()
    })

    expect(result.current.currentStep).toBe(2) // SelectPalette

    act(() => {
      result.current.goToPreviousStep()
    })

    expect(result.current.currentStep).toBe(1) // SelectAttributes
  })

  it('prevents navigation beyond bounds', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    // Try to go back from first step
    act(() => {
      result.current.goToPreviousStep()
    })

    expect(result.current.currentStep).toBe(0) // Still at first step

    // Go to last step
    act(() => {
      result.current.setCurrentStep(4) // Preview
    })

    // Try to go forward from last step
    act(() => {
      result.current.goToNextStep()
    })

    expect(result.current.currentStep).toBe(4) // Still at last step
  })

  it('handles attributes update', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    const newDataColumns = ['newAttr1', 'newAttr2']
    const newColors = ['#FF0000', '#00FF00']

    act(() => {
      result.current.handleAttributesUpdate(newDataColumns, newColors)
    })

    expect(result.current.currentProps.cy_dataColumns).toEqual(newDataColumns)
    expect(result.current.currentProps.cy_colors).toEqual(newColors)
  })

  it('handles palette change', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    // First add some attributes
    act(() => {
      result.current.handleAttributesUpdate(
        ['attr1', 'attr2'],
        ['#FF0000', '#00FF00'],
      )
    })

    // Then change palette
    act(() => {
      result.current.handlePaletteChange('Diverging1')
    })

    expect(result.current.currentProps.cy_colorScheme).toBe('Diverging1')
    // Colors should be updated based on the new palette
    expect(result.current.currentProps.cy_colors).toHaveLength(2)
  })

  it('handles properties update for pie chart', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    act(() => {
      result.current.handlePropertiesUpdate(180)
    })

    expect(result.current.currentProps.cy_startAngle).toBe(180)
    // Hole size should not be set for pie chart
    expect((result.current.currentProps as any).cy_holeSize).toBeUndefined()
  })

  it('handles properties update for ring chart', () => {
    const props = {
      ...defaultProps,
      initialValue: {
        ...mockCustomGraphics,
        name: CustomGraphicsNameType.RingChart,
        properties: mockRingChartProperties,
      },
    }

    const { result } = renderHook(() => useCustomGraphicState(props))

    act(() => {
      result.current.handlePropertiesUpdate(270, 0.6)
    })

    expect(result.current.currentProps.cy_startAngle).toBe(270)
    expect((result.current.currentProps as any).cy_holeSize).toBe(0.6)
  })

  it('handles remove charts', () => {
    const props = {
      ...defaultProps,
      initialValue: {
        ...mockCustomGraphics,
        name: CustomGraphicsNameType.PieChart,
        properties: mockPieChartProperties,
      },
    }

    const { result } = renderHook(() => useCustomGraphicState(props))

    let defaultGraphics: any
    act(() => {
      defaultGraphics = result.current.handleRemoveCharts()
    })

    expect(result.current.currentStep).toBe(0) // Back to SelectType
    expect(result.current.kind).toBe(CustomGraphicsNameType.PieChart)
    expect(result.current.currentProps.cy_dataColumns).toEqual([])
    expect(result.current.currentProps.cy_colors).toEqual([])
    expect(defaultGraphics).toBeDefined()
  })

  it('does not update when dialog is closed', () => {
    const props = {
      open: false,
      initialValue: null,
    }

    const { result } = renderHook(() => useCustomGraphicState(props))

    // The hook should not process updates when open is false
    expect(result.current.currentProps.cy_dataColumns).toEqual([])
  })

  it('maintains separate state for pie and ring charts', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    // Set up pie chart properties
    act(() => {
      result.current.handleAttributesUpdate(['pieAttr'], ['#FF0000'])
      result.current.handlePropertiesUpdate(90)
    })

    // Switch to ring chart
    act(() => {
      result.current.setKind(CustomGraphicsNameType.RingChart)
    })

    // Ring chart should have default properties
    expect(result.current.currentProps.cy_dataColumns).toEqual([])
    expect(result.current.currentProps.cy_colors).toEqual([])
    expect(result.current.currentProps.cy_startAngle).toBe(0)

    // Switch back to pie chart
    act(() => {
      result.current.setKind(CustomGraphicsNameType.PieChart)
    })

    // Pie chart properties should be preserved
    expect(result.current.currentProps.cy_dataColumns).toEqual(['pieAttr'])
    expect(result.current.currentProps.cy_colors).toEqual(['#FF0000'])
    expect(result.current.currentProps.cy_startAngle).toBe(90)
  })

  it('correctly identifies last step', () => {
    const { result } = renderHook(() => useCustomGraphicState(defaultProps))

    expect(result.current.isLastStep).toBe(false)

    act(() => {
      result.current.setCurrentStep(4) // Preview
    })

    expect(result.current.isLastStep).toBe(true)
  })
})
