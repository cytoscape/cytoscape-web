import { generateRandomColor, pickEvenly } from '../../utils/colorUtils'
import { ColorType } from '../../../../../../../models/VisualStyleModel/VisualPropertyValue'

describe('colorUtils', () => {
  describe('generateRandomColor', () => {
    it('returns a valid hex color', () => {
      const color = generateRandomColor()

      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(typeof color).toBe('string')
    })

    it('returns different colors on multiple calls', () => {
      const colors = new Set<ColorType>()

      // Generate multiple colors
      for (let i = 0; i < 10; i++) {
        colors.add(generateRandomColor())
      }

      // Should have at least a few different colors
      expect(colors.size).toBeGreaterThan(1)
    })

    it('returns colors from the predefined palette', () => {
      const validColors = [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#96CEB4',
        '#FFEAA7',
        '#DDA0DD',
        '#98D8C8',
        '#F7DC6F',
        '#BB8FCE',
        '#85C1E9',
        '#F8C471',
        '#82E0AA',
        '#F1948A',
        '#85C1E9',
        '#D7BDE2',
        '#A9CCE3',
        '#F9E79F',
        '#D5A6BD',
        '#A2D9CE',
        '#FAD7A0',
      ]

      const color = generateRandomColor()
      expect(validColors).toContain(color)
    })
  })

  describe('pickEvenly', () => {
    it('returns empty array for empty base', () => {
      const result = pickEvenly([], 5)
      expect(result).toEqual([])
    })

    it('returns empty array for count <= 0', () => {
      const base = ['#FF0000', '#00FF00', '#0000FF']
      const result = pickEvenly(base, 0)
      expect(result).toEqual([])
    })

    it('returns middle element for count = 1', () => {
      const base = ['#FF0000', '#00FF00', '#0000FF']
      const result = pickEvenly(base, 1)
      expect(result).toEqual(['#00FF00']) // Middle element
    })

    it('returns evenly distributed colors for count <= base length', () => {
      const base = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF']
      const result = pickEvenly(base, 3)

      expect(result).toHaveLength(3)
      expect(result[0]).toBe('#FF0000') // First
      expect(result[1]).toBe('#0000FF') // Middle
      expect(result[2]).toBe('#FF00FF') // Last
    })

    it('returns evenly distributed colors for count = base length', () => {
      const base = ['#FF0000', '#00FF00', '#0000FF']
      const result = pickEvenly(base, 3)

      expect(result).toEqual(base)
    })

    it('handles count > base length by cycling', () => {
      const base = ['#FF0000', '#00FF00']
      const result = pickEvenly(base, 5)

      expect(result).toHaveLength(5)
      expect(result[0]).toBe('#FF0000')
      expect(result[1]).toBe('#00FF00')
      expect(result[2]).toBe('#FF0000') // Cycles back
      expect(result[3]).toBe('#00FF00')
      expect(result[4]).toBe('#FF0000')
    })

    it('handles single element base', () => {
      const base = ['#FF0000']
      const result = pickEvenly(base, 3)

      expect(result).toEqual(['#FF0000', '#FF0000', '#FF0000'])
    })

    it('handles edge case with two elements', () => {
      const base = ['#FF0000', '#00FF00']
      const result = pickEvenly(base, 2)

      expect(result).toEqual(['#FF0000', '#00FF00'])
    })

    it('handles edge case with three elements', () => {
      const base = ['#FF0000', '#00FF00', '#0000FF']
      const result = pickEvenly(base, 2)

      expect(result).toEqual(['#FF0000', '#0000FF']) // First and last
    })

    it('handles edge case with four elements', () => {
      const base = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
      const result = pickEvenly(base, 3)

      expect(result).toEqual(['#FF0000', '#0000FF', '#FFFF00']) // First, middle, last
    })

    it('maintains color order from base array', () => {
      const base = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
      const result = pickEvenly(base, 4)

      expect(result).toEqual(base)
    })
  })
})
