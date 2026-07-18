import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../../TableModel'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { Column } from '../../TableModel'
import {
  resolveMappingColumnChange,
  supportsContinuousMapping,
  typesCanBeMapped,
  validMappingsForVP,
} from './mappingFunctionImpl'

// to run these: npx jest src/models/VisualStyleModel/impl/mappingFunctionImpl.test.ts

describe('MappingFunctionImpl', () => {
  describe('validMappingsForVP', () => {
    it('should return all mapping types for number visual properties', () => {
      const result = validMappingsForVP(VisualPropertyValueTypeName.Number)

      expect(result).toContain(MappingFunctionType.Continuous)
      expect(result).toContain(MappingFunctionType.Discrete)
      expect(result).toContain(MappingFunctionType.Passthrough)
      expect(result.length).toBe(3)
    })

    it('should return all mapping types for color visual properties', () => {
      const result = validMappingsForVP(VisualPropertyValueTypeName.Color)

      expect(result).toContain(MappingFunctionType.Continuous)
      expect(result).toContain(MappingFunctionType.Discrete)
      expect(result).toContain(MappingFunctionType.Passthrough)
      expect(result.length).toBe(3)
    })

    it('should return discrete and passthrough for string visual properties', () => {
      const result = validMappingsForVP(VisualPropertyValueTypeName.String)

      expect(result).toContain(MappingFunctionType.Discrete)
      expect(result).toContain(MappingFunctionType.Passthrough)
      expect(result).not.toContain(MappingFunctionType.Continuous)
      expect(result.length).toBe(2)
    })

    // CW-569: node shape and edge line type now support continuous mappings.
    it('should return all mapping types for node shape visual properties', () => {
      const result = validMappingsForVP(VisualPropertyValueTypeName.NodeShape)

      expect(result).toContain(MappingFunctionType.Discrete)
      expect(result).toContain(MappingFunctionType.Passthrough)
      expect(result).toContain(MappingFunctionType.Continuous)
    })

    it('should return all mapping types for edge line visual properties', () => {
      const result = validMappingsForVP(VisualPropertyValueTypeName.EdgeLine)

      expect(result).toContain(MappingFunctionType.Discrete)
      expect(result).toContain(MappingFunctionType.Passthrough)
      expect(result).toContain(MappingFunctionType.Continuous)
    })

    it('should return only discrete and passthrough for string visual properties', () => {
      const result = validMappingsForVP(VisualPropertyValueTypeName.String)

      expect(result).toContain(MappingFunctionType.Discrete)
      expect(result).toContain(MappingFunctionType.Passthrough)
      expect(result).not.toContain(MappingFunctionType.Continuous)
      expect(result.length).toBe(2)
    })
  })

  describe('typesCanBeMapped', () => {
    it('should allow passthrough mapping for matching types', () => {
      const result = typesCanBeMapped(
        MappingFunctionType.Passthrough,
        ValueTypeName.String,
        VisualPropertyValueTypeName.String,
      )

      expect(result).toBe(true)
    })

    it('should allow passthrough mapping for number types', () => {
      const result = typesCanBeMapped(
        MappingFunctionType.Passthrough,
        ValueTypeName.Double,
        VisualPropertyValueTypeName.Number,
      )

      expect(result).toBe(true)
    })

    it('should allow passthrough mapping from any single value to string', () => {
      const result = typesCanBeMapped(
        MappingFunctionType.Passthrough,
        ValueTypeName.Integer,
        VisualPropertyValueTypeName.String,
      )

      expect(result).toBe(true)
    })

    it('should not allow passthrough mapping from list types', () => {
      const result = typesCanBeMapped(
        MappingFunctionType.Passthrough,
        ValueTypeName.ListString,
        VisualPropertyValueTypeName.String,
      )

      expect(result).toBe(false)
    })

    it('should allow continuous mapping for numeric types to number visual property', () => {
      expect(
        typesCanBeMapped(
          MappingFunctionType.Continuous,
          ValueTypeName.Integer,
          VisualPropertyValueTypeName.Number,
        ),
      ).toBe(true)
      expect(
        typesCanBeMapped(
          MappingFunctionType.Continuous,
          ValueTypeName.Double,
          VisualPropertyValueTypeName.Number,
        ),
      ).toBe(true)
      expect(
        typesCanBeMapped(
          MappingFunctionType.Continuous,
          ValueTypeName.Long,
          VisualPropertyValueTypeName.Number,
        ),
      ).toBe(true)
    })

    it('should allow continuous mapping for numeric types to color visual property', () => {
      expect(
        typesCanBeMapped(
          MappingFunctionType.Continuous,
          ValueTypeName.Double,
          VisualPropertyValueTypeName.Color,
        ),
      ).toBe(true)
    })

    it('should not allow continuous mapping for non-numeric value types', () => {
      expect(
        typesCanBeMapped(
          MappingFunctionType.Continuous,
          ValueTypeName.String,
          VisualPropertyValueTypeName.Number,
        ),
      ).toBe(false)
    })

    it('should not allow continuous mapping to non-number/color visual properties', () => {
      expect(
        typesCanBeMapped(
          MappingFunctionType.Continuous,
          ValueTypeName.Double,
          VisualPropertyValueTypeName.String,
        ),
      ).toBe(false)
    })

    it('should allow discrete mapping for any types', () => {
      expect(
        typesCanBeMapped(
          MappingFunctionType.Discrete,
          ValueTypeName.String,
          VisualPropertyValueTypeName.String,
        ),
      ).toBe(true)
      expect(
        typesCanBeMapped(
          MappingFunctionType.Discrete,
          ValueTypeName.Integer,
          VisualPropertyValueTypeName.Number,
        ),
      ).toBe(true)
      expect(
        typesCanBeMapped(
          MappingFunctionType.Discrete,
          ValueTypeName.Boolean,
          VisualPropertyValueTypeName.String,
        ),
      ).toBe(true)
    })
  })

  // CW-569: continuous mappings are allowed on discrete-valued VPs (edge line
  // type, node shape, etc.) as long as the attribute is numeric.
  describe('continuous mapping on discrete visual properties', () => {
    it('supportsContinuousMapping includes discrete-valued VP types', () => {
      expect(
        supportsContinuousMapping(VisualPropertyValueTypeName.Number),
      ).toBe(true)
      expect(supportsContinuousMapping(VisualPropertyValueTypeName.Color)).toBe(
        true,
      )
      expect(
        supportsContinuousMapping(VisualPropertyValueTypeName.EdgeLine),
      ).toBe(true)
      expect(
        supportsContinuousMapping(VisualPropertyValueTypeName.NodeShape),
      ).toBe(true)
      expect(
        supportsContinuousMapping(VisualPropertyValueTypeName.String),
      ).toBe(false)
    })

    it('validMappingsForVP offers continuous for edge line type', () => {
      expect(validMappingsForVP(VisualPropertyValueTypeName.EdgeLine)).toContain(
        MappingFunctionType.Continuous,
      )
    })

    it('typesCanBeMapped allows continuous edge line on a numeric attribute', () => {
      expect(
        typesCanBeMapped(
          MappingFunctionType.Continuous,
          ValueTypeName.Double,
          VisualPropertyValueTypeName.EdgeLine,
        ),
      ).toBe(true)
      // still requires a numeric attribute
      expect(
        typesCanBeMapped(
          MappingFunctionType.Continuous,
          ValueTypeName.String,
          VisualPropertyValueTypeName.EdgeLine,
        ),
      ).toBe(false)
    })
  })

  // CW-616 / CW-651: choosing an attribute for a mapping must resolve the type
  // from the newly selected attribute (not the previously selected one), or a
  // mapping created from a blank state silently reverts.
  describe('resolveMappingColumnChange', () => {
    const columns: Column[] = [
      { name: 'name', type: ValueTypeName.String },
      { name: 'score', type: ValueTypeName.Double },
    ]

    it('creates a passthrough mapping from a blank state', () => {
      const change = resolveMappingColumnChange(
        columns,
        'name',
        MappingFunctionType.Passthrough,
        VisualPropertyValueTypeName.String,
      )
      expect(change).toEqual({
        kind: 'create',
        attributeType: ValueTypeName.String,
      })
    })

    it('creates a continuous mapping for a compatible numeric attribute', () => {
      const change = resolveMappingColumnChange(
        columns,
        'score',
        MappingFunctionType.Continuous,
        VisualPropertyValueTypeName.Number,
      )
      expect(change).toEqual({
        kind: 'create',
        attributeType: ValueTypeName.Double,
      })
    })

    it('removes the mapping when the attribute type is incompatible', () => {
      const change = resolveMappingColumnChange(
        columns,
        'name',
        MappingFunctionType.Continuous,
        VisualPropertyValueTypeName.Number,
      )
      expect(change).toEqual({ kind: 'remove' })
    })

    it('clears when there is no mapping type or no attribute', () => {
      expect(
        resolveMappingColumnChange(
          columns,
          'name',
          '',
          VisualPropertyValueTypeName.String,
        ),
      ).toEqual({ kind: 'clear' })
      expect(
        resolveMappingColumnChange(
          columns,
          '',
          MappingFunctionType.Passthrough,
          VisualPropertyValueTypeName.String,
        ),
      ).toEqual({ kind: 'clear' })
    })

    it('clears when the attribute is not in the table', () => {
      expect(
        resolveMappingColumnChange(
          columns,
          'missing',
          MappingFunctionType.Passthrough,
          VisualPropertyValueTypeName.String,
        ),
      ).toEqual({ kind: 'clear' })
    })
  })
})

