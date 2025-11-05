import { EdgeArrowShapeType } from '../VisualPropertyValue'
import {
  isOpenShape,
  openShapeToFilledShape,
} from './EdgeArrowShapeImpl'

// to run these: npx jest src/models/VisualStyleModel/impl/EdgeArrowShapeImpl.test.ts

describe('EdgeArrowShapeImpl', () => {
  describe('isOpenShape', () => {
    it('should return true for shapes with "open_" prefix', () => {
      expect(isOpenShape('open_circle')).toBe(true)
      expect(isOpenShape('open_diamond')).toBe(true)
      expect(isOpenShape('open_square')).toBe(true)
      expect(isOpenShape('open_delta')).toBe(true)
    })

    it('should return false for shapes without "open_" prefix', () => {
      expect(isOpenShape('triangle')).toBe(false)
      expect(isOpenShape('circle')).toBe(false)
      expect(isOpenShape('diamond')).toBe(false)
      expect(isOpenShape('none')).toBe(false)
    })

    it('should return true for EdgeArrowShapeType.OpenCircle', () => {
      expect(isOpenShape(EdgeArrowShapeType.OpenCircle)).toBe(true)
      expect(isOpenShape(EdgeArrowShapeType.OpenDiamond)).toBe(true)
      expect(isOpenShape(EdgeArrowShapeType.OpenSquare)).toBe(true)
      expect(isOpenShape(EdgeArrowShapeType.OpenDelta)).toBe(true)
    })

    it('should return false for closed shapes', () => {
      expect(isOpenShape(EdgeArrowShapeType.Triangle)).toBe(false)
      expect(isOpenShape(EdgeArrowShapeType.Circle)).toBe(false)
      expect(isOpenShape(EdgeArrowShapeType.Diamond)).toBe(false)
      expect(isOpenShape(EdgeArrowShapeType.Square)).toBe(false)
      expect(isOpenShape(EdgeArrowShapeType.None)).toBe(false)
    })

    it('should handle non-string values gracefully', () => {
      expect(isOpenShape(null as any)).toBe(false)
      expect(isOpenShape(undefined as any)).toBe(false)
      expect(isOpenShape(123 as any)).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isOpenShape('')).toBe(false)
    })
  })

  describe('openShapeToFilledShape', () => {
    it('should convert OpenDelta to Triangle', () => {
      const result = openShapeToFilledShape(EdgeArrowShapeType.OpenDelta)
      expect(result).toBe(EdgeArrowShapeType.Triangle)
    })

    it('should convert OpenCrossDelta to TriangleCross', () => {
      const result = openShapeToFilledShape(EdgeArrowShapeType.OpenCrossDelta)
      expect(result).toBe(EdgeArrowShapeType.TriangleCross)
    })

    it('should convert open_circle to circle', () => {
      const result = openShapeToFilledShape(EdgeArrowShapeType.OpenCircle)
      expect(result).toBe('circle')
    })

    it('should convert open_diamond to diamond', () => {
      const result = openShapeToFilledShape(EdgeArrowShapeType.OpenDiamond)
      expect(result).toBe('diamond')
    })

    it('should convert open_square to square', () => {
      const result = openShapeToFilledShape(EdgeArrowShapeType.OpenSquare)
      expect(result).toBe('square')
    })

    it('should return unchanged for closed shapes', () => {
      expect(openShapeToFilledShape(EdgeArrowShapeType.Triangle)).toBe(
        EdgeArrowShapeType.Triangle,
      )
      expect(openShapeToFilledShape(EdgeArrowShapeType.Circle)).toBe(
        EdgeArrowShapeType.Circle,
      )
      expect(openShapeToFilledShape(EdgeArrowShapeType.Diamond)).toBe(
        EdgeArrowShapeType.Diamond,
      )
      expect(openShapeToFilledShape(EdgeArrowShapeType.None)).toBe(
        EdgeArrowShapeType.None,
      )
    })

    it('should handle generic open_ prefix removal', () => {
      const result = openShapeToFilledShape('open_custom' as EdgeArrowShapeType)
      expect(result).toBe('custom')
    })

    it('should handle shapes without open_ prefix', () => {
      const result = openShapeToFilledShape('triangle' as EdgeArrowShapeType)
      expect(result).toBe('triangle')
    })
  })
})

