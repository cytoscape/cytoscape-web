import { IdType } from '../../IdType'
import { AttributeName, ValueType, ValueTypeName } from '../../TableModel'
import {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
  VisualPropertyName,
  VisualStyle,
} from '..'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { createVisualStyle } from './visualStyleFnImpl'
import {
  createContinuousMapping,
  createDiscreteMapping,
  createPassthroughMapping,
  deleteBypass,
  deleteDiscreteMappingValue,
  removeMapping,
  setBypass,
  setBypassMap,
  setContinuousMappingValues,
  setDefault,
  setDiscreteMappingValue,
  setMapping,
} from './visualStyleImpl'

// to run these: npx jest src/models/VisualStyleModel/impl/visualStyleImpl.test.ts

describe('VisualStyleImpl', () => {
  describe('setDefault', () => {
    it('should set the default value for a visual property', () => {
      const visualStyle = createVisualStyle()
      const originalDefault = visualStyle.nodeShape.defaultValue

      const result = setDefault(visualStyle, 'nodeShape', 'ellipse')

      expect(result.nodeShape.defaultValue).toBe('ellipse')
      expect(result).not.toBe(visualStyle) // Immutability check
      expect(visualStyle.nodeShape.defaultValue).toBe(originalDefault) // Original unchanged
    })

    it('should preserve other visual property properties', () => {
      const visualStyle = createVisualStyle()
      const originalBypassMap = visualStyle.nodeShape.bypassMap
      const originalType = visualStyle.nodeShape.type

      const result = setDefault(visualStyle, 'nodeShape', 'ellipse')

      expect(result.nodeShape.bypassMap).toBe(originalBypassMap)
      expect(result.nodeShape.type).toBe(originalType)
    })
  })

  describe('setBypass', () => {
    it('should set bypass values for multiple elements', () => {
      const visualStyle = createVisualStyle()
      const elementIds: IdType[] = ['node-1', 'node-2', 'node-3']
      const vpValue = '#FF0000'

      const result = setBypass(visualStyle, 'nodeBackgroundColor', elementIds, vpValue)

      const bypassMap = result.nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBe(vpValue)
      expect(bypassMap.get('node-2')).toBe(vpValue)
      expect(bypassMap.get('node-3')).toBe(vpValue)
      expect(result).not.toBe(visualStyle) // Immutability check
      expect(visualStyle.nodeBackgroundColor.bypassMap.get('node-1')).toBeUndefined() // Original unchanged
    })

    it('should update existing bypass values', () => {
      const visualStyle = createVisualStyle()
      const initialBypassMap = new Map<IdType, any>([['node-1', '#FF0000']])
      let result = {
        ...visualStyle,
        nodeBackgroundColor: {
          ...visualStyle.nodeBackgroundColor,
          bypassMap: initialBypassMap,
        },
      }

      result = setBypass(result, 'nodeBackgroundColor', ['node-1'], '#00FF00')

      const bypassMap = result.nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBe('#00FF00')
    })

    it('should preserve other bypass values', () => {
      const visualStyle = createVisualStyle()
      const initialBypassMap = new Map<IdType, any>([
        ['node-1', '#FF0000'],
        ['node-2', '#00FF00'],
      ])
      let result = {
        ...visualStyle,
        nodeBackgroundColor: {
          ...visualStyle.nodeBackgroundColor,
          bypassMap: initialBypassMap,
        },
      }

      result = setBypass(result, 'nodeBackgroundColor', ['node-3'], '#0000FF')

      const bypassMap = result.nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBe('#FF0000')
      expect(bypassMap.get('node-2')).toBe('#00FF00')
      expect(bypassMap.get('node-3')).toBe('#0000FF')
    })
  })

  describe('deleteBypass', () => {
    it('should delete bypass values for multiple elements', () => {
      const visualStyle = createVisualStyle()
      const initialBypassMap = new Map<IdType, any>([
        ['node-1', '#FF0000'],
        ['node-2', '#00FF00'],
        ['node-3', '#0000FF'],
      ])
      let result = {
        ...visualStyle,
        nodeBackgroundColor: {
          ...visualStyle.nodeBackgroundColor,
          bypassMap: initialBypassMap,
        },
      }

      result = deleteBypass(result, 'nodeBackgroundColor', ['node-1', 'node-2'])

      const bypassMap = result.nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBeUndefined()
      expect(bypassMap.get('node-2')).toBeUndefined()
      expect(bypassMap.get('node-3')).toBe('#0000FF') // Preserved
      expect(result).not.toBe(visualStyle) // Immutability check
    })

    it('should handle deleting non-existent bypass values gracefully', () => {
      const visualStyle = createVisualStyle()
      const initialBypassMap = new Map<IdType, any>([['node-1', '#FF0000']])
      let result = {
        ...visualStyle,
        nodeBackgroundColor: {
          ...visualStyle.nodeBackgroundColor,
          bypassMap: initialBypassMap,
        },
      }

      result = deleteBypass(result, 'nodeBackgroundColor', ['node-999'])

      const bypassMap = result.nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBe('#FF0000') // Preserved
      expect(bypassMap.get('node-999')).toBeUndefined()
    })
  })

  describe('setBypassMap', () => {
    it('should set the entire bypass map', () => {
      const visualStyle = createVisualStyle()
      const newBypassMap = new Map<IdType, any>([
        ['node-1', '#FF0000'],
        ['node-2', '#00FF00'],
      ])

      const result = setBypassMap(visualStyle, 'nodeBackgroundColor', newBypassMap)

      const bypassMap = result.nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBe('#FF0000')
      expect(bypassMap.get('node-2')).toBe('#00FF00')
      expect(result).not.toBe(visualStyle) // Immutability check
    })

    it('should replace existing bypass map', () => {
      const visualStyle = createVisualStyle()
      const initialBypassMap = new Map<IdType, any>([['node-1', '#FF0000']])
      let result = {
        ...visualStyle,
        nodeBackgroundColor: {
          ...visualStyle.nodeBackgroundColor,
          bypassMap: initialBypassMap,
        },
      }

      const newBypassMap = new Map<IdType, any>([['node-2', '#00FF00']])
      result = setBypassMap(result, 'nodeBackgroundColor', newBypassMap)

      const bypassMap = result.nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBeUndefined()
      expect(bypassMap.get('node-2')).toBe('#00FF00')
    })
  })

  describe('createDiscreteMapping', () => {
    it('should create a discrete mapping function', () => {
      const visualStyle = createVisualStyle()
      const attributeName: AttributeName = 'type'

      const result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        attributeName,
        ValueTypeName.String,
      )

      const mapping = result.nodeShape.mapping as DiscreteMappingFunction
      expect(mapping).toBeDefined()
      expect(mapping.type).toBe(MappingFunctionType.Discrete)
      expect(mapping.attribute).toBe(attributeName)
      expect(mapping.vpValueMap).toBeInstanceOf(Map)
      expect(result).not.toBe(visualStyle) // Immutability check
    })

    it('should preserve the default value', () => {
      const visualStyle = createVisualStyle()
      const originalDefault = visualStyle.nodeShape.defaultValue

      const result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )

      const mapping = result.nodeShape.mapping as DiscreteMappingFunction
      expect(mapping.defaultValue).toBe(originalDefault)
    })

    it('should preserve visual property type', () => {
      const visualStyle = createVisualStyle()
      const originalType = visualStyle.nodeShape.type

      const result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )

      const mapping = result.nodeShape.mapping as DiscreteMappingFunction
      expect(mapping.visualPropertyType).toBe(originalType)
    })
  })

  describe('setDiscreteMappingValue', () => {
    it('should set mapping values for multiple attribute values', () => {
      const visualStyle = createVisualStyle()
      const values: ValueType[] = ['type1', 'type2', 'type3']
      const vpValue = 'ellipse'

      let result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )
      result = setDiscreteMappingValue(result, 'nodeShape', values, vpValue)

      const mapping = result.nodeShape.mapping as DiscreteMappingFunction
      expect(mapping.vpValueMap.get('type1')).toBe(vpValue)
      expect(mapping.vpValueMap.get('type2')).toBe(vpValue)
      expect(mapping.vpValueMap.get('type3')).toBe(vpValue)
      expect(result).not.toBe(visualStyle) // Immutability check
    })

    it('should update existing mapping values', () => {
      const visualStyle = createVisualStyle()

      let result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )
      result = setDiscreteMappingValue(result, 'nodeShape', ['type1'], 'ellipse')
      result = setDiscreteMappingValue(result, 'nodeShape', ['type1'], 'diamond')

      const mapping = result.nodeShape.mapping as DiscreteMappingFunction
      expect(mapping.vpValueMap.get('type1')).toBe('diamond')
    })

    it('should return unchanged if mapping does not exist', () => {
      const visualStyle = createVisualStyle()

      const result = setDiscreteMappingValue(
        visualStyle,
        'nodeShape',
        ['type1'],
        'ellipse',
      )

      expect(result).toBe(visualStyle) // Should return unchanged
      expect(result.nodeShape.mapping).toBeUndefined()
    })
  })

  describe('deleteDiscreteMappingValue', () => {
    it('should delete mapping values for multiple attribute values', () => {
      const visualStyle = createVisualStyle()

      let result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )
      result = setDiscreteMappingValue(result, 'nodeShape', ['type1', 'type2'], 'ellipse')
      result = deleteDiscreteMappingValue(result, 'nodeShape', ['type1', 'type2'])

      const mapping = result.nodeShape.mapping as DiscreteMappingFunction
      expect(mapping.vpValueMap.get('type1')).toBeUndefined()
      expect(mapping.vpValueMap.get('type2')).toBeUndefined()
    })

    it('should return unchanged if mapping does not exist', () => {
      const visualStyle = createVisualStyle()

      const result = deleteDiscreteMappingValue(visualStyle, 'nodeShape', ['type1'])

      expect(result).toBe(visualStyle) // Should return unchanged
    })
  })

  describe('setContinuousMappingValues', () => {
    it('should set continuous mapping values', () => {
      const visualStyle = createVisualStyle()

      let result = createContinuousMapping(
        visualStyle,
        'nodeWidth',
        VisualPropertyValueTypeName.Number,
        'score',
        [10, 20, 30, 40, 50],
      )

      const min: ContinuousFunctionControlPoint = {
        value: 10,
        vpValue: 20,
        inclusive: false,
      }
      const max: ContinuousFunctionControlPoint = {
        value: 50,
        vpValue: 100,
        inclusive: false,
      }
      const controlPoints: ContinuousFunctionControlPoint[] = [
        { value: 10, vpValue: 20 },
        { value: 30, vpValue: 60 },
        { value: 50, vpValue: 100 },
      ]

      result = setContinuousMappingValues(
        result,
        'nodeWidth',
        min,
        max,
        controlPoints,
        20,
        100,
      )

      const mapping = result.nodeWidth.mapping as ContinuousMappingFunction
      expect(mapping.min.value).toBe(10)
      expect(mapping.min.vpValue).toBe(20)
      expect(mapping.max.value).toBe(50)
      expect(mapping.max.vpValue).toBe(100)
      expect(mapping.controlPoints).toHaveLength(3)
      expect(mapping.ltMinVpValue).toBe(20)
      expect(mapping.gtMaxVpValue).toBe(100)
      expect(result).not.toBe(visualStyle) // Immutability check
    })

    it('should return unchanged if mapping does not exist', () => {
      const visualStyle = createVisualStyle()
      const min: ContinuousFunctionControlPoint = {
        value: 10,
        vpValue: 20,
        inclusive: false,
      }
      const max: ContinuousFunctionControlPoint = {
        value: 50,
        vpValue: 100,
        inclusive: false,
      }
      const controlPoints: ContinuousFunctionControlPoint[] = []

      const result = setContinuousMappingValues(
        visualStyle,
        'nodeWidth',
        min,
        max,
        controlPoints,
        20,
        100,
      )

      expect(result).toBe(visualStyle) // Should return unchanged
    })
  })

  describe('createContinuousMapping', () => {
    it('should create a continuous mapping for color type', () => {
      const visualStyle = createVisualStyle()
      const attributeValues: ValueType[] = [-10, 0, 10, 20, 30]

      const result = createContinuousMapping(
        visualStyle,
        'nodeBackgroundColor',
        VisualPropertyValueTypeName.Color,
        'score',
        attributeValues,
      )

      const mapping = result.nodeBackgroundColor.mapping as ContinuousMappingFunction
      expect(mapping).toBeDefined()
      expect(mapping.type).toBe(MappingFunctionType.Continuous)
      expect(mapping.attribute).toBe('score')
      expect(mapping.controlPoints).toBeDefined()
      expect(mapping.controlPoints.length).toBeGreaterThan(0)
    })

    it('should create a continuous mapping for number type', () => {
      const visualStyle = createVisualStyle()
      const attributeValues: ValueType[] = [10, 20, 30, 40, 50]

      const result = createContinuousMapping(
        visualStyle,
        'nodeWidth',
        VisualPropertyValueTypeName.Number,
        'score',
        attributeValues,
      )

      const mapping = result.nodeWidth.mapping as ContinuousMappingFunction
      expect(mapping).toBeDefined()
      expect(mapping.type).toBe(MappingFunctionType.Continuous)
      expect(mapping.attribute).toBe('score')
    })

    it('should preserve the default value', () => {
      const visualStyle = createVisualStyle()
      const originalDefault = visualStyle.nodeWidth.defaultValue

      const result = createContinuousMapping(
        visualStyle,
        'nodeWidth',
        VisualPropertyValueTypeName.Number,
        'score',
        [10, 20, 30],
      )

      const mapping = result.nodeWidth.mapping as ContinuousMappingFunction
      expect(mapping.defaultValue).toBe(originalDefault)
    })

    it('should return unchanged if vpType is not Color or Number', () => {
      const visualStyle = createVisualStyle()

      const result = createContinuousMapping(
        visualStyle,
        'nodeShape',
        VisualPropertyValueTypeName.NodeShape,
        'type',
        ['type1', 'type2'],
      )

      expect(result).toBe(visualStyle) // Should return unchanged
      expect(result.nodeShape.mapping).toBeUndefined()
    })
  })

  describe('createPassthroughMapping', () => {
    it('should create a passthrough mapping function', () => {
      const visualStyle = createVisualStyle()
      const attributeName: AttributeName = 'name'

      const result = createPassthroughMapping(
        visualStyle,
        'nodeLabel',
        attributeName,
        ValueTypeName.String,
      )

      const mapping = result.nodeLabel.mapping as PassthroughMappingFunction
      expect(mapping).toBeDefined()
      expect(mapping.type).toBe(MappingFunctionType.Passthrough)
      expect(mapping.attribute).toBe(attributeName)
      expect(result).not.toBe(visualStyle) // Immutability check
    })

    it('should preserve the default value', () => {
      const visualStyle = createVisualStyle()
      const originalDefault = visualStyle.nodeLabel.defaultValue

      const result = createPassthroughMapping(
        visualStyle,
        'nodeLabel',
        'name',
        ValueTypeName.String,
      )

      const mapping = result.nodeLabel.mapping as PassthroughMappingFunction
      expect(mapping.defaultValue).toBe(originalDefault)
    })

    it('should preserve visual property type', () => {
      const visualStyle = createVisualStyle()
      const originalType = visualStyle.nodeLabel.type

      const result = createPassthroughMapping(
        visualStyle,
        'nodeLabel',
        'name',
        ValueTypeName.String,
      )

      const mapping = result.nodeLabel.mapping as PassthroughMappingFunction
      expect(mapping.visualPropertyType).toBe(originalType)
    })
  })

  describe('removeMapping', () => {
    it('should remove a mapping function', () => {
      const visualStyle = createVisualStyle()

      let result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )
      result = removeMapping(result, 'nodeShape')

      expect(result.nodeShape.mapping).toBeUndefined()
      expect(result).not.toBe(visualStyle) // Immutability check
      expect(visualStyle.nodeShape.mapping).toBeUndefined() // Original unchanged
    })

    it('should preserve other visual property properties', () => {
      const visualStyle = createVisualStyle()
      const originalDefault = visualStyle.nodeShape.defaultValue
      const originalBypassMap = visualStyle.nodeShape.bypassMap

      let result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )
      result = removeMapping(result, 'nodeShape')

      expect(result.nodeShape.defaultValue).toBe(originalDefault)
      expect(result.nodeShape.bypassMap).toBe(originalBypassMap)
    })
  })

  describe('setMapping', () => {
    it('should set a discrete mapping function', () => {
      const visualStyle = createVisualStyle()
      const mapping: DiscreteMappingFunction = {
        type: MappingFunctionType.Discrete,
        attribute: 'type',
        vpValueMap: new Map([['type1', 'ellipse']]),
        visualPropertyType: 'nodeShape',
        defaultValue: 'round-rectangle',
      }

      const result = setMapping(visualStyle, 'nodeShape', mapping)

      const resultMapping = result.nodeShape.mapping as DiscreteMappingFunction
      expect(resultMapping.type).toBe(MappingFunctionType.Discrete)
      expect(resultMapping.attribute).toBe('type')
      expect(resultMapping.vpValueMap.get('type1')).toBe('ellipse')
      expect(result).not.toBe(visualStyle) // Immutability check
    })

    it('should set a continuous mapping function', () => {
      const visualStyle = createVisualStyle()
      const mapping: ContinuousMappingFunction = {
        type: MappingFunctionType.Continuous,
        attribute: 'score',
        min: { value: 10, vpValue: 20, inclusive: false },
        max: { value: 50, vpValue: 100, inclusive: false },
        controlPoints: [
          { value: 10, vpValue: 20 },
          { value: 30, vpValue: 60 },
          { value: 50, vpValue: 100 },
        ],
        visualPropertyType: 'number',
        defaultValue: 75,
        ltMinVpValue: 20,
        gtMaxVpValue: 100,
      }

      const result = setMapping(visualStyle, 'nodeWidth', mapping)

      const resultMapping = result.nodeWidth.mapping as ContinuousMappingFunction
      expect(resultMapping.type).toBe(MappingFunctionType.Continuous)
      expect(resultMapping.attribute).toBe('score')
    })

    it('should set a passthrough mapping function', () => {
      const visualStyle = createVisualStyle()
      const mapping: PassthroughMappingFunction = {
        type: MappingFunctionType.Passthrough,
        attribute: 'name',
        visualPropertyType: 'string',
        defaultValue: '',
      }

      const result = setMapping(visualStyle, 'nodeLabel', mapping)

      const resultMapping = result.nodeLabel.mapping as PassthroughMappingFunction
      expect(resultMapping.type).toBe(MappingFunctionType.Passthrough)
      expect(resultMapping.attribute).toBe('name')
    })

    it('should remove mapping when set to undefined', () => {
      const visualStyle = createVisualStyle()

      let result = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )
      result = setMapping(result, 'nodeShape', undefined)

      expect(result.nodeShape.mapping).toBeUndefined()
    })
  })

  describe('immutability', () => {
    it('should not mutate the original visual style in any operation', () => {
      const original = createVisualStyle()
      const originalDefault = original.nodeShape.defaultValue
      const originalBypassMap = original.nodeShape.bypassMap

      // Perform various operations
      let visualStyle = setDefault(original, 'nodeShape', 'ellipse')
      visualStyle = setBypass(visualStyle, 'nodeBackgroundColor', ['node-1'], '#FF0000')
      visualStyle = createDiscreteMapping(
        visualStyle,
        'nodeShape',
        'type',
        ValueTypeName.String,
      )
      visualStyle = setDiscreteMappingValue(visualStyle, 'nodeShape', ['type1'], 'diamond')

      // Verify original is unchanged
      expect(original.nodeShape.defaultValue).toBe(originalDefault)
      expect(original.nodeShape.bypassMap).toBe(originalBypassMap)
      expect(original.nodeShape.mapping).toBeUndefined()
      expect(original.nodeBackgroundColor.bypassMap.get('node-1')).toBeUndefined()
    })
  })
})

