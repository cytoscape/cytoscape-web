import { VALID_PIE_CHART_SLICE_INDEX_RANGE } from './customGraphicsImpl'
import { VisualPropertyName } from '../VisualPropertyName'
import { CyjsVisualPropertyName } from './CyjsProperties/cyjsVisualPropertyName'
import {
  getCyjsVpName,
  getPieBackgroundColorCyJsProp,
  getPieBackgroundSizeCyJsProp,
} from './cyJsVisualPropertyConverter'

// to run these: npx jest src/models/VisualStyleModel/impl/cyJsVisualPropertyConverter.test.ts

describe('cyJsVisualPropertyConverter', () => {
  describe('getCyjsVpName', () => {
    it('should map node visual properties to cyjs names', () => {
      expect(getCyjsVpName(VisualPropertyName.NodeShape)).toBe(
        CyjsVisualPropertyName.Shape,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeHeight)).toBe(
        CyjsVisualPropertyName.Height,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeWidth)).toBe(
        CyjsVisualPropertyName.Width,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeBackgroundColor)).toBe(
        CyjsVisualPropertyName.BackgroundColor,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeOpacity)).toBe(
        CyjsVisualPropertyName.Opacity,
      )
    })

    it('should map node border properties to cyjs names', () => {
      expect(getCyjsVpName(VisualPropertyName.NodeBorderColor)).toBe(
        CyjsVisualPropertyName.BorderColor,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeBorderLineType)).toBe(
        CyjsVisualPropertyName.BorderLineType,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeBorderWidth)).toBe(
        CyjsVisualPropertyName.BorderWidth,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeBorderOpacity)).toBe(
        CyjsVisualPropertyName.BorderOpacity,
      )
    })

    it('should map node label properties to cyjs names', () => {
      expect(getCyjsVpName(VisualPropertyName.NodeLabel)).toBe(
        CyjsVisualPropertyName.Label,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeLabelColor)).toBe(
        CyjsVisualPropertyName.LabelColor,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeLabelFontSize)).toBe(
        CyjsVisualPropertyName.LabelFontSize,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeLabelFont)).toBe(
        CyjsVisualPropertyName.LabelFont,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeLabelRotation)).toBe(
        CyjsVisualPropertyName.LabelRotation,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeLabelOpacity)).toBe(
        CyjsVisualPropertyName.LabelOpacity,
      )
    })

    it('should map edge visual properties to cyjs names', () => {
      expect(getCyjsVpName(VisualPropertyName.EdgeLineType)).toBe(
        CyjsVisualPropertyName.LineStyle,
      )
      expect(getCyjsVpName(VisualPropertyName.EdgeLineColor)).toBe(
        CyjsVisualPropertyName.LineColor,
      )
      expect(getCyjsVpName(VisualPropertyName.EdgeWidth)).toBe(
        CyjsVisualPropertyName.Width,
      )
      expect(getCyjsVpName(VisualPropertyName.EdgeTargetArrowShape)).toBe(
        CyjsVisualPropertyName.TargetArrowShape,
      )
      expect(getCyjsVpName(VisualPropertyName.EdgeSourceArrowShape)).toBe(
        CyjsVisualPropertyName.SourceArrowShape,
      )
    })

    it('should map edge label properties to cyjs names', () => {
      expect(getCyjsVpName(VisualPropertyName.EdgeLabel)).toBe(
        CyjsVisualPropertyName.Label,
      )
      expect(getCyjsVpName(VisualPropertyName.EdgeLabelColor)).toBe(
        CyjsVisualPropertyName.LabelColor,
      )
      expect(getCyjsVpName(VisualPropertyName.EdgeLabelFontSize)).toBe(
        CyjsVisualPropertyName.LabelFontSize,
      )
      expect(getCyjsVpName(VisualPropertyName.EdgeLabelFont)).toBe(
        CyjsVisualPropertyName.LabelFont,
      )
    })

    it('should map network visual properties to cyjs names', () => {
      expect(getCyjsVpName(VisualPropertyName.NetworkBackgroundColor)).toBe(
        CyjsVisualPropertyName.BackgroundColor,
      )
    })

    it('should map custom graphics properties to cyjs names', () => {
      // Custom graphics properties map to PieSize as placeholder
      expect(getCyjsVpName(VisualPropertyName.NodeImageChart1)).toBe(
        CyjsVisualPropertyName.PieSize,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeImageChartPosition1)).toBe(
        CyjsVisualPropertyName.PieSize,
      )
      expect(getCyjsVpName(VisualPropertyName.NodeImageChartSize1)).toBe(
        CyjsVisualPropertyName.PieSize,
      )
    })

    it('should map visibility properties to cyjs names', () => {
      expect(getCyjsVpName(VisualPropertyName.NodeVisibility)).toBe(
        CyjsVisualPropertyName.Visibility,
      )
      expect(getCyjsVpName(VisualPropertyName.EdgeVisibility)).toBe(
        CyjsVisualPropertyName.Visibility,
      )
    })

    it('should return a string for all visual property names', () => {
      Object.values(VisualPropertyName).forEach((vpName) => {
        const cyjsName = getCyjsVpName(vpName as VisualPropertyName)
        expect(typeof cyjsName).toBe('string')
        expect(cyjsName).toBeDefined()
      })
    })
  })

  describe('getPieBackgroundColorCyJsProp', () => {
    it('should return correct format for valid indices', () => {
      expect(getPieBackgroundColorCyJsProp(1)).toBe('pie-1-background-color')
      expect(getPieBackgroundColorCyJsProp(8)).toBe('pie-8-background-color')
      expect(getPieBackgroundColorCyJsProp(16)).toBe('pie-16-background-color')
    })

    it('should return correct format for all valid indices in range', () => {
      for (let i = 1; i <= 16; i++) {
        const result = getPieBackgroundColorCyJsProp(i)
        expect(result).toBe(`pie-${i}-background-color`)
        expect(typeof result).toBe('string')
      }
    })

    it('should handle invalid indices below range', () => {
      const result = getPieBackgroundColorCyJsProp(0)
      expect(result).toBe('pie-0-background-color')
      expect(typeof result).toBe('string')
    })

    it('should handle invalid indices above range', () => {
      const result = getPieBackgroundColorCyJsProp(17)
      expect(result).toBe('pie-17-background-color')
      expect(typeof result).toBe('string')
    })

    it('should handle negative indices', () => {
      const result = getPieBackgroundColorCyJsProp(-1)
      expect(result).toBe('pie--1-background-color')
      expect(typeof result).toBe('string')
    })

    it('should use VALID_PIE_CHART_SLICE_INDEX_RANGE constant', () => {
      const minIndex = VALID_PIE_CHART_SLICE_INDEX_RANGE[0]
      const maxIndex = VALID_PIE_CHART_SLICE_INDEX_RANGE[1]

      expect(getPieBackgroundColorCyJsProp(minIndex)).toBe(
        `pie-${minIndex}-background-color`,
      )
      expect(getPieBackgroundColorCyJsProp(maxIndex)).toBe(
        `pie-${maxIndex}-background-color`,
      )
    })
  })

  describe('getPieBackgroundSizeCyJsProp', () => {
    it('should return correct format for valid indices', () => {
      expect(getPieBackgroundSizeCyJsProp(1)).toBe('pie-1-background-size')
      expect(getPieBackgroundSizeCyJsProp(8)).toBe('pie-8-background-size')
      expect(getPieBackgroundSizeCyJsProp(16)).toBe('pie-16-background-size')
    })

    it('should return correct format for all valid indices in range', () => {
      for (let i = 1; i <= 16; i++) {
        const result = getPieBackgroundSizeCyJsProp(i)
        expect(result).toBe(`pie-${i}-background-size`)
        expect(typeof result).toBe('string')
      }
    })

    it('should handle invalid indices below range', () => {
      const result = getPieBackgroundSizeCyJsProp(0)
      expect(result).toBe('pie-0-background-size')
      expect(typeof result).toBe('string')
    })

    it('should handle invalid indices above range', () => {
      const result = getPieBackgroundSizeCyJsProp(17)
      expect(result).toBe('pie-17-background-size')
      expect(typeof result).toBe('string')
    })

    it('should handle negative indices', () => {
      const result = getPieBackgroundSizeCyJsProp(-1)
      expect(result).toBe('pie--1-background-size')
      expect(typeof result).toBe('string')
    })

    it('should use VALID_PIE_CHART_SLICE_INDEX_RANGE constant', () => {
      const minIndex = VALID_PIE_CHART_SLICE_INDEX_RANGE[0]
      const maxIndex = VALID_PIE_CHART_SLICE_INDEX_RANGE[1]

      expect(getPieBackgroundSizeCyJsProp(minIndex)).toBe(
        `pie-${minIndex}-background-size`,
      )
      expect(getPieBackgroundSizeCyJsProp(maxIndex)).toBe(
        `pie-${maxIndex}-background-size`,
      )
    })

    it('should return different values for color vs size properties', () => {
      const colorProp = getPieBackgroundColorCyJsProp(1)
      const sizeProp = getPieBackgroundSizeCyJsProp(1)

      expect(colorProp).not.toBe(sizeProp)
      expect(colorProp).toContain('background-color')
      expect(sizeProp).toContain('background-size')
    })
  })
})
