import {
  validMappingsForVP,
  typesCanBeMapped,
} from './MappingFunctionImpl'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { ValueTypeName } from '../../TableModel'

// to run these: npx jest src/models/VisualStyleModel/impl/MappingFunctionImpl.test.ts

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

    it('should return discrete and passthrough for node shape visual properties', () => {
      const result = validMappingsForVP(VisualPropertyValueTypeName.NodeShape)

      expect(result).toContain(MappingFunctionType.Discrete)
      expect(result).toContain(MappingFunctionType.Passthrough)
      expect(result).not.toContain(MappingFunctionType.Continuous)
      expect(result.length).toBe(2)
    })

    it('should return discrete and passthrough for edge line visual properties', () => {
      const result = validMappingsForVP(VisualPropertyValueTypeName.EdgeLine)

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
})

