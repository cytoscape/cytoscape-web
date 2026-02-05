import { VisualPropertyName } from '../VisualPropertyName'
import { CyjsVisualPropertyName } from './CyjsProperties/cyjsVisualPropertyName'
import { getCyjsVpName } from './cyJsVisualPropertyConverter'

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
})

