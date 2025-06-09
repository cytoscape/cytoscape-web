import { Cx2 } from '../Cx2'
import {
  findAspect,
  validateCx2Metadata,
  validateCx2Structure,
} from './validator'

describe('validateCx2Structure', () => {
  // Helper function to create a minimal valid CX2 document
  const createMinimalValidCx = () => [
    {
      CXVersion: '2.0',
    },
  ]

  describe('basic structure validation', () => {
    it('should accept a valid minimal CX2 document', () => {
      const result = validateCx2Structure(createMinimalValidCx())
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject non-array input', () => {
      const result = validateCx2Structure({})
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    // it('should reject empty array', () => {
    //   const result = validateCx2Structure([])
    //   expect(result.isValid).toBe(false)
    //   expect(result.errors).toHaveLength(1)
    // })
  })

  describe('preamble validation', () => {
    it('should accept preamble with optional hasFragments', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
          hasFragments: true,
        },
      ])
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid CX version', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '1.0',
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    // it('should reject preamble with invalid hasFragments type', () => {
    //   const result = validateCx2Structure([
    //     {
    //       CXVersion: '2.0',
    //       hasFragments: 'true',
    //     },
    //   ])
    //   expect(result.isValid).toBe(false)
    //   expect(result.errors).toHaveLength(1)
    // })

    // it('should reject preamble with extra properties', () => {
    //   const result = validateCx2Structure([
    //     {
    //       CXVersion: '2.0',
    //       extraProp: 'value',
    //     },
    //   ])
    //   expect(result.isValid).toBe(false)
    //   expect(result.errors).toHaveLength(1)
    // })
  })

  describe('aspect validation', () => {
    it('should accept valid aspects after preamble', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        {
          nodes: [],
        },
        {
          edges: [],
        },
      ])
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject aspect with multiple keys', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        {
          nodes: [],
          edges: [],
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should reject aspect with non-array value', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        {
          nodes: 'not an array',
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should reject non-object aspect', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        'not an aspect',
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('complex document validation', () => {
    it('should accept a complex valid document', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
          hasFragments: true,
        },
        {
          nodes: [{ id: 1 }, { id: 2 }],
        },
        {
          edges: [{ id: 1, s: 1, t: 2 }],
        },
        {
          networkAttributes: [
            {
              name: 'Test Network',
            },
          ],
        },
      ])

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject document with invalid aspect after valid aspects', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        {
          nodes: [],
        },
        {
          edges: 'not an array', // Invalid aspect
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('validateCx2Metadata', () => {
    it('should return valid when metadata and all aspects are present', () => {
      const input = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [] },
        { aspect2: [] },
      ]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return an error when metadata aspect is missing', () => {
      const input = [{ CXVersion: '2.0' }, { aspect1: [] }, { aspect2: [] }]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should return an error when an aspect referenced in metadata is missing', () => {
      const input = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [] },
      ]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should return valid when metadata is empty', () => {
      const input = [{ CXVersion: '2.0' }, { metaData: [] }]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return valid when metadata aspect is present but no aspects are defined', () => {
      const input = [{ CXVersion: '2.0' }, { metaData: [] }]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle invalid metadata structure gracefully', () => {
      const input = [
        { CXVersion: '2.0' },
        { metaData: 'invalid' }, // Invalid metadata structure
      ]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true) // No validation for metadata structure itself
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('findAspect', () => {
    it('should return the aspect value when the aspect key exists', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [{ id: 1 }] },
        { aspect2: [{ id: 2 }] },
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toEqual([{ id: 1 }])
    })

    it('should return undefined when the aspect key does not exist', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [{ id: 1 }] },
      ]

      const result = findAspect(cx, 'aspect2')
      expect(result).toBeUndefined()
    })

    it('should return undefined when the CX array is empty', () => {
      const cx: unknown[] = []

      const result = findAspect(cx, 'aspect1')
      expect(result).toBeUndefined()
    })

    it('should return undefined when the CX array does not contain valid objects', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }] },
        'invalid',
        null,
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toBeUndefined()
    })

    it('should return undefined when the aspect key exists but has a null value', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }] },
        { aspect1: null },
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toBeNull()
    })

    it('should return the correct aspect value when multiple aspects exist', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [{ id: 1 }] },
        { aspect2: [{ id: 2 }] },
      ]

      const result = findAspect(cx, 'aspect2')
      expect(result).toEqual([{ id: 2 }])
    })

    it('should handle cases where the aspect key is at the beginning of the CX array', () => {
      const cx = [
        { aspect1: [{ id: 1 }] },
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }] },
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toEqual([{ id: 1 }])
    })

    it('should handle cases where the aspect key is deeply nested (not directly supported)', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }] },
        { aspect1: { nested: [{ id: 1 }] } },
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toEqual({ nested: [{ id: 1 }] })
    })
  })
})
