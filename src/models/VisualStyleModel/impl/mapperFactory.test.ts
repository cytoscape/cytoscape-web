import { beforeEach, describe, expect, it } from 'vitest'

import { ValueTypeName } from '../../TableModel'
import { ContinuousMappingFunction } from '../VisualMappingFunction/ContinuousMappingFunction'
import { DiscreteMappingFunction } from '../VisualMappingFunction/DiscreteMappingFunction'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { PassthroughMappingFunction } from '../VisualMappingFunction/PassthroughMappingFunction'
import { Mapper } from '../VisualMappingFunction/Mapper'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import {
  createContinuousMapper,
  createDiscreteMapper,
  createPassthroughMapper,
} from './mapperFactory'

// to run these: npx jest src/models/VisualStyleModel/impl/mapperFactory.test.ts

describe('MapperFactory', () => {
  describe('createDiscreteMapper', () => {
    it('should create a mapper that returns mapped values', () => {
      const vpValueMap = new Map([
        ['type1', '#FF0000'],
        ['type2', '#00FF00'],
        ['type3', '#0000FF'],
      ])

      const mapping: DiscreteMappingFunction = {
        type: MappingFunctionType.Discrete,
        attribute: 'type',
        vpValueMap,
        visualPropertyType: VisualPropertyValueTypeName.Color,
        defaultValue: '#CCCCCC',
        attributeType: ValueTypeName.String,
      }

      const mapper = createDiscreteMapper(mapping)

      expect(mapper('type1')).toBe('#FF0000')
      expect(mapper('type2')).toBe('#00FF00')
      expect(mapper('type3')).toBe('#0000FF')
    })

    it('should return default value for unmapped values', () => {
      const vpValueMap = new Map([['type1', '#FF0000']])

      const mapping: DiscreteMappingFunction = {
        type: MappingFunctionType.Discrete,
        attribute: 'type',
        vpValueMap,
        visualPropertyType: VisualPropertyValueTypeName.Color,
        defaultValue: '#CCCCCC',
        attributeType: ValueTypeName.String,
      }

      const mapper = createDiscreteMapper(mapping)

      expect(mapper('unmapped')).toBe('#CCCCCC')
      expect(mapper('type2')).toBe('#CCCCCC')
    })

    it('should handle numeric values', () => {
      const vpValueMap = new Map([
        [1, 10],
        [2, 20],
        [3, 30],
      ])

      const mapping: DiscreteMappingFunction = {
        type: MappingFunctionType.Discrete,
        attribute: 'score',
        vpValueMap,
        visualPropertyType: VisualPropertyValueTypeName.Number,
        defaultValue: 5,
        attributeType: ValueTypeName.Integer,
      }

      const mapper = createDiscreteMapper(mapping)

      expect(mapper(1)).toBe(10)
      expect(mapper(2)).toBe(20)
      expect(mapper(3)).toBe(30)
      expect(mapper(4)).toBe(5) // default
    })

    it('should handle boolean values', () => {
      const vpValueMap = new Map([
        [true, '#FF0000'],
        [false, '#00FF00'],
      ])

      const mapping: DiscreteMappingFunction = {
        type: MappingFunctionType.Discrete,
        attribute: 'isActive',
        vpValueMap,
        visualPropertyType: VisualPropertyValueTypeName.Color,
        defaultValue: '#CCCCCC',
        attributeType: ValueTypeName.Boolean,
      }

      const mapper = createDiscreteMapper(mapping)

      expect(mapper(true)).toBe('#FF0000')
      expect(mapper(false)).toBe('#00FF00')
    })
  })

  describe('createPassthroughMapper', () => {
    it('should create a mapper that passes through string values', () => {
      const mapping: PassthroughMappingFunction = {
        type: MappingFunctionType.Passthrough,
        attribute: 'name',
        visualPropertyType: VisualPropertyValueTypeName.String,
        defaultValue: '',
        attributeType: ValueTypeName.String,
      }

      const mapper = createPassthroughMapper(mapping)

      expect(mapper('test')).toBe('test')
      expect(mapper('value')).toBe('value')
    })

    it('should return value when provided', () => {
      const mapping: PassthroughMappingFunction = {
        type: MappingFunctionType.Passthrough,
        attribute: 'name',
        visualPropertyType: VisualPropertyValueTypeName.String,
        defaultValue: 'default',
        attributeType: ValueTypeName.String,
      }

      const mapper = createPassthroughMapper(mapping)

      expect(mapper('test')).toBe('test')
      expect(mapper('value')).toBe('value')
    })

    it('should handle numeric passthrough', () => {
      const mapping: PassthroughMappingFunction = {
        type: MappingFunctionType.Passthrough,
        attribute: 'score',
        visualPropertyType: VisualPropertyValueTypeName.Number,
        defaultValue: 0,
        attributeType: ValueTypeName.Double,
      }

      const mapper = createPassthroughMapper(mapping)

      expect(mapper(10.5)).toBe(10.5)
      expect(mapper(20)).toBe(20)
    })

    it('should normalize visibility values', () => {
      const mapping: PassthroughMappingFunction = {
        type: MappingFunctionType.Passthrough,
        attribute: 'visibility',
        visualPropertyType: VisualPropertyValueTypeName.Visibility,
        defaultValue: 'element',
        attributeType: ValueTypeName.String,
      }

      const mapper = createPassthroughMapper(mapping)

      // Should normalize boolean values
      expect(mapper(true)).toBe('element')
      expect(mapper(false)).toBe('none')
      
      // Should normalize string boolean values
      expect(mapper('true')).toBe('element')
      expect(mapper('false')).toBe('none')
    })

    describe('CustomGraphic Passthrough', () => {
      let mapping: PassthroughMappingFunction
      let mapper: Mapper

      beforeEach(() => {
        mapping = {
          type: MappingFunctionType.Passthrough,
          attribute: 'image',
          visualPropertyType: VisualPropertyValueTypeName.CustomGraphic,
          defaultValue: { type: 'none', name: 'none', properties: {} } as any,
          attributeType: ValueTypeName.String,
        }
        mapper = createPassthroughMapper(mapping)
      })

      it('should parse HTTP/HTTPS URLs to images', () => {
        const url1 = 'https://example.com/img.png'
        const url2 = 'http://example.com/img.png'
        expect(mapper(url1)).toMatchObject({ type: 'image', properties: { url: url1 } })
        expect(mapper(url2)).toMatchObject({ type: 'image', properties: { url: url2 } })
      })

      it('should parse data URIs to images', () => {
        const dataUri = 'data:image/png;base64,iVBOR...'
        expect(mapper(dataUri)).toMatchObject({ type: 'image', properties: { url: dataUri } })
      })

      it('should parse raw SVGs to images with data URI', () => {
        const svg = '<svg><rect/></svg>'
        const expectedUri = 'data:image/svg+xml,' + encodeURIComponent(svg)
        expect(mapper(svg)).toMatchObject({ type: 'image', properties: { url: expectedUri } })
      })

      it('should parse SVGs with leading whitespace', () => {
        const svg = '  <svg><rect/></svg>  '
        const expectedUri = 'data:image/svg+xml,' + encodeURIComponent('<svg><rect/></svg>')
        expect(mapper(svg)).toMatchObject({ type: 'image', properties: { url: expectedUri } })
      })

      it('should reject file: URLs and return default', () => {
        const result = mapper('file:/Users/foo/img.png')
        expect(result).toEqual(mapping.defaultValue)
      })

      it('should reject blob: URLs and return default', () => {
        const result = mapper('blob:http://localhost/abc-123')
        expect(result).toEqual(mapping.defaultValue)
      })

      it('should parse valid pie JSON to pie chart', () => {
        const json = '{"cy_dataColumns":["a"],"cy_colors":["#f00"]}'
        expect(mapper(json)).toMatchObject({ type: 'chart', name: 'org.cytoscape.PieChart', properties: { cy_dataColumns: ["a"] } })
      })

      it('should parse valid ring JSON to ring chart', () => {
        const json = '{"cy_dataColumns":["a"],"cy_colors":["#f00"],"cy_holeSize":0.4}'
        expect(mapper(json)).toMatchObject({ type: 'chart', name: 'org.cytoscape.RingChart', properties: { cy_holeSize: 0.4 } })
      })

      it('should return default for malformed JSON', () => {
        expect(mapper('{ broken json')).toEqual(mapping.defaultValue)
      })

      it('should return default for valid JSON but wrong shape', () => {
        expect(mapper('{"foo":"bar"}')).toEqual(mapping.defaultValue)
      })

      it('should return default for empty string', () => {
        expect(mapper('')).toEqual(mapping.defaultValue)
      })

      it('should return default for null/undefined', () => {
        expect(mapper(null as any)).toEqual(mapping.defaultValue)
        expect(mapper(undefined as any)).toEqual(mapping.defaultValue)
      })

      it('should return default for unrecognized strings', () => {
        expect(mapper('not-a-url')).toEqual(mapping.defaultValue)
      })
    })
  })

  describe('createContinuousMapper', () => {
    it('should create a mapper for color mappings', () => {
      const mapping: ContinuousMappingFunction = {
        type: MappingFunctionType.Continuous,
        attribute: 'score',
        visualPropertyType: VisualPropertyValueTypeName.Color,
        defaultValue: '#CCCCCC',
        attributeType: ValueTypeName.Double,
        min: {
          value: 0,
          vpValue: '#0000FF',
          inclusive: true,
        },
        max: {
          value: 100,
          vpValue: '#FF0000',
          inclusive: true,
        },
        controlPoints: [
          { value: 50, vpValue: '#00FF00' },
        ],
        ltMinVpValue: '#0000FF',
        gtMaxVpValue: '#FF0000',
      }

      const mapper = createContinuousMapper(mapping)

      expect(mapper).toBeDefined()
      expect(typeof mapper(0)).toBe('string')
    })

    it('should create a mapper for number mappings', () => {
      const mapping: ContinuousMappingFunction = {
        type: MappingFunctionType.Continuous,
        attribute: 'score',
        visualPropertyType: VisualPropertyValueTypeName.Number,
        defaultValue: 10,
        attributeType: ValueTypeName.Double,
        min: {
          value: 0,
          vpValue: 5,
          inclusive: true,
        },
        max: {
          value: 100,
          vpValue: 50,
          inclusive: true,
        },
        controlPoints: [
          { value: 50, vpValue: 25 },
        ],
        ltMinVpValue: 5,
        gtMaxVpValue: 50,
      }

      const mapper = createContinuousMapper(mapping)

      expect(mapper).toBeDefined()
      expect(typeof mapper(0)).toBe('number')
    })

    it('should map values correctly with control points', () => {
      const mapping: ContinuousMappingFunction = {
        type: MappingFunctionType.Continuous,
        attribute: 'score',
        visualPropertyType: VisualPropertyValueTypeName.Number,
        defaultValue: 10,
        attributeType: ValueTypeName.Double,
        min: {
          value: 0,
          vpValue: 5,
          inclusive: true,
        },
        max: {
          value: 100,
          vpValue: 50,
          inclusive: true,
        },
        controlPoints: [
          { value: 25, vpValue: 15 },
          { value: 75, vpValue: 35 },
        ],
        ltMinVpValue: 5,
        gtMaxVpValue: 50,
      }

      const mapper = createContinuousMapper(mapping)

      // Test with a value within range
      const result = mapper(50)
      expect(result).toBeDefined()
      expect(typeof result).toBe('number')
      // Test with value below min
      expect(mapper(-10)).toBe(5)
      // Test with value above max
      expect(mapper(150)).toBe(50)
    })
  })
})

