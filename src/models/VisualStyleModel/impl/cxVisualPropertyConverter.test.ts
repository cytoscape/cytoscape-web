import {
  vpToCX,
  convertPassthroughMappingToCX,
  convertDiscreteMappingToCX,
  convertContinuousMappingToCX,
  VPColorConverter,
  VPStringConverter,
  VPNumberConverter,
  VPFontTypeConverter,
  VPNodeShapeTypeConverter,
  VPEdgeArrowShapeTypeConverter,
  VPBooleanConverter,
  VPNodeLabelPositionConverter,
  VPCustomGraphicsConverter,
  VPCustomGraphicsPositionConverter,
  VPCustomGraphicsSizeConverter,
  cxVisualPropertyConverter,
} from './cxVisualPropertyConverter'
import { VisualPropertyName } from '../VisualPropertyName'
import { EdgeArrowShapeType } from '../VisualPropertyValue'
import { VisualStyle } from '../VisualStyle'
import { createVisualStyle } from './VisualStyleFnImpl'
import { PassthroughMappingFunction } from '../VisualMappingFunction/PassthroughMappingFunction'
import { DiscreteMappingFunction } from '../VisualMappingFunction/DiscreteMappingFunction'
import { ContinuousMappingFunction } from '../VisualMappingFunction/ContinuousMappingFunction'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { ValueTypeName } from '../../TableModel'

// to run these: npx jest src/models/VisualStyleModel/impl/cxVisualPropertyConverter.test.ts

describe('cxVisualPropertyConverter', () => {
  describe('vpToCX', () => {
    it('should convert font values to CX font format', () => {
      const result = vpToCX('nodeLabelFont', 'sans-serif')

      expect(result).toHaveProperty('FONT_FAMILY')
      expect(result).toHaveProperty('FONT_STYLE')
      expect(result).toHaveProperty('FONT_WEIGHT')
      expect((result as any).FONT_FAMILY).toBe('sans-serif')
    })

    it('should pass through non-font values', () => {
      const result = vpToCX('nodeBackgroundColor', '#FF0000')

      expect(result).toBe('#FF0000')
    })

    it('should handle string values', () => {
      const result = vpToCX('nodeLabel', 'test label')

      expect(result).toBe('test label')
    })

    it('should handle number values', () => {
      const result = vpToCX('nodeWidth', 100)

      expect(result).toBe(100)
    })
  })

  describe('convertPassthroughMappingToCX', () => {
    it('should convert passthrough mapping to CX format', () => {
      const vs = createVisualStyle()
      const vp = vs.nodeLabel
      const mapping: PassthroughMappingFunction = {
        type: MappingFunctionType.Passthrough,
        attribute: 'name',
        visualPropertyType: VisualPropertyValueTypeName.String,
        defaultValue: '',
        attributeType: ValueTypeName.String,
      }

      const result = convertPassthroughMappingToCX(vs, vp, mapping, true)

      expect(result.type).toBe('PASSTHROUGH')
      expect(result.definition.attribute).toBe('name')
    })

    it('should include type when attribute not in table', () => {
      const vs = createVisualStyle()
      const vp = vs.nodeLabel
      const mapping: PassthroughMappingFunction = {
        type: MappingFunctionType.Passthrough,
        attribute: 'name',
        visualPropertyType: VisualPropertyValueTypeName.String,
        defaultValue: '',
        attributeType: ValueTypeName.String,
      }

      const result = convertPassthroughMappingToCX(vs, vp, mapping, false)

      expect(result.definition.type).toBe(ValueTypeName.String)
    })
  })

  describe('convertDiscreteMappingToCX', () => {
    it('should convert discrete mapping to CX format', () => {
      const vs = createVisualStyle()
      const vp = vs.nodeBackgroundColor
      const vpValueMap = new Map([
        ['type1', '#FF0000'],
        ['type2', '#00FF00'],
      ])
      const mapping: DiscreteMappingFunction = {
        type: MappingFunctionType.Discrete,
        attribute: 'type',
        vpValueMap,
        visualPropertyType: VisualPropertyValueTypeName.Color,
        defaultValue: '#CCCCCC',
        attributeType: ValueTypeName.String,
      }

      const result = convertDiscreteMappingToCX(vs, vp, mapping, true)

      expect(result.type).toBe('DISCRETE')
      expect(result.definition.attribute).toBe('type')
      expect(result.definition.map).toHaveLength(2)
      expect(result.definition.map[0].v).toBe('type1')
    })

    it('should include type when attribute not in table', () => {
      const vs = createVisualStyle()
      const vp = vs.nodeBackgroundColor
      const vpValueMap = new Map([['type1', '#FF0000']])
      const mapping: DiscreteMappingFunction = {
        type: MappingFunctionType.Discrete,
        attribute: 'type',
        vpValueMap,
        visualPropertyType: VisualPropertyValueTypeName.Color,
        defaultValue: '#CCCCCC',
        attributeType: ValueTypeName.String,
      }

      const result = convertDiscreteMappingToCX(vs, vp, mapping, false)

      expect(result.definition.type).toBe(ValueTypeName.String)
    })
  })

  describe('convertContinuousMappingToCX', () => {
    it('should convert continuous mapping to CX format', () => {
      const vs = createVisualStyle()
      const vp = vs.nodeWidth
      const mapping: ContinuousMappingFunction = {
        type: MappingFunctionType.Continuous,
        attribute: 'score',
        visualPropertyType: VisualPropertyValueTypeName.Number,
        defaultValue: 50,
        attributeType: ValueTypeName.Double,
        min: {
          value: 0,
          vpValue: 10,
          inclusive: true,
        },
        max: {
          value: 100,
          vpValue: 100,
          inclusive: true,
        },
        controlPoints: [
          { value: 50, vpValue: 50 },
        ],
        ltMinVpValue: 10,
        gtMaxVpValue: 100,
      }

      const result = convertContinuousMappingToCX(vs, vp, mapping, true)

      expect(result.type).toBe('CONTINUOUS')
      expect(result.definition.attribute).toBe('score')
      expect(result.definition.map.length).toBeGreaterThan(0)
    })

    it('should include type when attribute not in table', () => {
      const vs = createVisualStyle()
      const vp = vs.nodeWidth
      const mapping: ContinuousMappingFunction = {
        type: MappingFunctionType.Continuous,
        attribute: 'score',
        visualPropertyType: VisualPropertyValueTypeName.Number,
        defaultValue: 50,
        attributeType: ValueTypeName.Double,
        min: {
          value: 0,
          vpValue: 10,
          inclusive: true,
        },
        max: {
          value: 100,
          vpValue: 100,
          inclusive: true,
        },
        controlPoints: [
          { value: 50, vpValue: 50 },
        ],
        ltMinVpValue: 10,
        gtMaxVpValue: 100,
      }

      const result = convertContinuousMappingToCX(vs, vp, mapping, false)

      expect(result.definition.type).toBe(ValueTypeName.Double)
    })
  })

  describe('VPColorConverter', () => {
    it('should create a color converter', () => {
      const converter = VPColorConverter('NODE_BACKGROUND_COLOR')

      expect(converter.cxVPName).toBe('NODE_BACKGROUND_COLOR')
      expect(converter.valueConverter('#FF0000')).toBe('#FF0000')
    })
  })

  describe('VPStringConverter', () => {
    it('should create a string converter', () => {
      const converter = VPStringConverter('NODE_LABEL')

      expect(converter.cxVPName).toBe('NODE_LABEL')
      expect(converter.valueConverter('test')).toBe('test')
    })
  })

  describe('VPNumberConverter', () => {
    it('should create a number converter', () => {
      const converter = VPNumberConverter('NODE_WIDTH')

      expect(converter.cxVPName).toBe('NODE_WIDTH')
      expect(converter.valueConverter(100)).toBe(100)
    })
  })

  describe('VPFontTypeConverter', () => {
    it('should create a font converter', () => {
      const converter = VPFontTypeConverter('NODE_LABEL_FONT_FACE')

      expect(converter.cxVPName).toBe('NODE_LABEL_FONT_FACE')
      const result = converter.valueConverter({
        FONT_FAMILY: 'sans-serif',
        FONT_STYLE: 'normal',
        FONT_WEIGHT: 'normal',
      } as any)
      expect(result).toBe('sans-serif')
    })
  })

  describe('VPEdgeArrowShapeTypeConverter', () => {
    it('should convert Arrow to Triangle', () => {
      const converter = VPEdgeArrowShapeTypeConverter('EDGE_TARGET_ARROW_SHAPE')

      expect(converter.cxVPName).toBe('EDGE_TARGET_ARROW_SHAPE')
      expect(converter.valueConverter(EdgeArrowShapeType.Arrow)).toBe(
        EdgeArrowShapeType.Triangle,
      )
    })

    it('should pass through other arrow shapes', () => {
      const converter = VPEdgeArrowShapeTypeConverter('EDGE_TARGET_ARROW_SHAPE')

      expect(converter.valueConverter(EdgeArrowShapeType.Circle)).toBe(
        EdgeArrowShapeType.Circle,
      )
      expect(converter.valueConverter(EdgeArrowShapeType.Diamond)).toBe(
        EdgeArrowShapeType.Diamond,
      )
    })
  })

  describe('VPBooleanConverter', () => {
    it('should create a boolean converter', () => {
      const converter = VPBooleanConverter('PROPERTY')

      expect(converter.cxVPName).toBe('PROPERTY')
      expect(converter.valueConverter(true)).toBe(true)
      expect(converter.valueConverter(false)).toBe(false)
    })
  })

  describe('VPNodeLabelPositionConverter', () => {
    it('should create a label position converter', () => {
      const converter = VPNodeLabelPositionConverter('NODE_LABEL_POSITION')

      expect(converter.cxVPName).toBe('NODE_LABEL_POSITION')
      const position = {
        HORIZONTAL_ALIGN: 'center',
        VERTICAL_ALIGN: 'center',
        HORIZONTAL_ANCHOR: 'center',
        VERTICAL_ANCHOR: 'center',
        JUSTIFICATION: 'center',
        MARGIN_X: 0,
        MARGIN_Y: 0,
      }
      expect(converter.valueConverter(position as any)).toEqual(position)
    })
  })

  describe('VPCustomGraphicsConverter', () => {
    it('should create a custom graphics converter', () => {
      const converter = VPCustomGraphicsConverter('NODE_CUSTOMGRAPHICS_1')

      expect(converter.cxVPName).toBe('NODE_CUSTOMGRAPHICS_1')
      const customGraphics = {
        type: 'chart',
        name: 'org.cytoscape.PieChart',
        properties: {},
      }
      expect(converter.valueConverter(customGraphics as any)).toEqual(
        customGraphics,
      )
    })

    it('should return default when value is undefined', () => {
      const converter = VPCustomGraphicsConverter('NODE_CUSTOMGRAPHICS_1')

      // valueConverter accepts optional parameter, but we need to cast it
      const result = converter.valueConverter(undefined as any)
      expect(result.type).toBe('none')
      expect(result.name).toBe('none')
    })
  })

  describe('VPCustomGraphicsPositionConverter', () => {
    it('should create a custom graphics position converter', () => {
      const converter = VPCustomGraphicsPositionConverter(
        'NODE_CUSTOMGRAPHICS_POSITION_1',
      )

      expect(converter.cxVPName).toBe('NODE_CUSTOMGRAPHICS_POSITION_1')
      const position = {
        justification: 'center',
        marginX: 0,
        marginY: 0,
        entityAnchor: 'C',
        graphicsAnchor: 'C',
      }
      expect(converter.valueConverter(position as any)).toEqual(position)
    })
  })

  describe('VPCustomGraphicsSizeConverter', () => {
    it('should create a custom graphics size converter', () => {
      const converter = VPCustomGraphicsSizeConverter('NODE_CUSTOMGRAPHICS_SIZE_1')

      expect(converter.cxVPName).toBe('NODE_CUSTOMGRAPHICS_SIZE_1')
      expect(converter.valueConverter(100)).toBe(100)
    })

    it('should return default size when value is undefined', () => {
      const converter = VPCustomGraphicsSizeConverter('NODE_CUSTOMGRAPHICS_SIZE_1')

      // valueConverter accepts optional parameter, but we need to cast it
      expect(converter.valueConverter(undefined as any)).toBe(50)
    })
  })

  describe('cxVisualPropertyConverter', () => {
    it('should contain converters for all visual properties', () => {
      expect(cxVisualPropertyConverter.nodeShape).toBeDefined()
      expect(cxVisualPropertyConverter.nodeBackgroundColor).toBeDefined()
      expect(cxVisualPropertyConverter.edgeLineColor).toBeDefined()
      expect(cxVisualPropertyConverter.networkBackgroundColor).toBeDefined()
    })

    it('should have correct CX names for node properties', () => {
      expect(cxVisualPropertyConverter.nodeShape.cxVPName).toBe('NODE_SHAPE')
      expect(cxVisualPropertyConverter.nodeBackgroundColor.cxVPName).toBe(
        'NODE_BACKGROUND_COLOR',
      )
      expect(cxVisualPropertyConverter.nodeWidth.cxVPName).toBe('NODE_WIDTH')
      expect(cxVisualPropertyConverter.nodeHeight.cxVPName).toBe('NODE_HEIGHT')
    })

    it('should have correct CX names for edge properties', () => {
      expect(cxVisualPropertyConverter.edgeLineColor.cxVPName).toBe(
        'EDGE_LINE_COLOR',
      )
      expect(cxVisualPropertyConverter.edgeWidth.cxVPName).toBe('EDGE_WIDTH')
      expect(cxVisualPropertyConverter.edgeTargetArrowShape.cxVPName).toBe(
        'EDGE_TARGET_ARROW_SHAPE',
      )
    })

    it('should have correct CX names for custom graphics', () => {
      expect(cxVisualPropertyConverter.nodeImageChart1.cxVPName).toBe(
        'NODE_CUSTOMGRAPHICS_1',
      )
      expect(cxVisualPropertyConverter.nodeImageChartSize1.cxVPName).toBe(
        'NODE_CUSTOMGRAPHICS_SIZE_1',
      )
    })
  })
})

