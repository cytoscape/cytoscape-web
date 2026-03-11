import { ColorType } from '../VisualPropertyValue/ColorType'
import { ColorPalette } from '../VisualPropertyValue/ColorPalette'
import { generateRandomColor, pickEvenly } from './colorUtils'

// to run these: npx jest src/models/VisualStyleModel/impl/colorUtils.test.ts

describe('colorUtils', () => {
  describe('generateRandomColor', () => {
    it('should return a color from the predefined list', () => {
      const color = generateRandomColor()
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
        '#D7BDE2',
        '#A9CCE3',
        '#F9E79F',
        '#D5A6BD',
        '#A2D9CE',
        '#FAD7A0',
      ]
      expect(validColors).toContain(color)
    })

    it('should return a valid hex color string', () => {
      const color = generateRandomColor()
      expect(typeof color).toBe('string')
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should return different colors on multiple calls (probabilistic)', () => {
      const colors = new Set<ColorType>()
      // Call multiple times to increase chance of getting different colors
      for (let i = 0; i < 50; i++) {
        colors.add(generateRandomColor())
      }
      // With 20 colors in the list, we should get at least 2 different ones
      expect(colors.size).toBeGreaterThan(1)
    })

    it('should only return colors from the predefined list', () => {
      const validColors = new Set([
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
        '#D7BDE2',
        '#A9CCE3',
        '#F9E79F',
        '#D5A6BD',
        '#A2D9CE',
        '#FAD7A0',
      ])

      // Test multiple times to ensure all returned colors are valid
      for (let i = 0; i < 100; i++) {
        const color = generateRandomColor()
        expect(validColors.has(color)).toBe(true)
      }
    })
  })

  describe('pickEvenly', () => {
    it('should return empty array for empty base', () => {
      const result = pickEvenly([], 5)
      expect(result).toEqual([])
    })

    it('should return empty array for count <= 0', () => {
      const base: ColorPalette = ['#FF0000', '#00FF00', '#0000FF']
      expect(pickEvenly(base, 0)).toEqual([])
      expect(pickEvenly(base, -1)).toEqual([])
    })

    it('should return middle element for count === 1', () => {
      const base: ColorPalette = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF']
      const result = pickEvenly(base, 1)
      expect(result).toHaveLength(1)
      // For 5 elements, middle is index 2 (Math.floor((5-1)/2) = 2)
      expect(result[0]).toBe('#0000FF')
    })

    it('should return middle element for count === 1 with even-length base', () => {
      const base: ColorPalette = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
      const result = pickEvenly(base, 1)
      expect(result).toHaveLength(1)
      // For 4 elements, middle is index 1 (Math.floor((4-1)/2) = 1)
      expect(result[0]).toBe('#00FF00')
    })

    it('should return all elements when count equals base length', () => {
      const base: ColorPalette = ['#FF0000', '#00FF00', '#0000FF']
      const result = pickEvenly(base, 3)
      expect(result).toEqual(base)
    })

    it('should return evenly distributed elements when count < base length', () => {
      const base: ColorPalette = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF']
      const result = pickEvenly(base, 3)
      expect(result).toHaveLength(3)
      // Should pick first, middle, and last
      expect(result[0]).toBe('#FF0000')
      expect(result[1]).toBe('#0000FF')
      expect(result[2]).toBe('#FF00FF')
    })

    it('should return evenly distributed elements for count = 2', () => {
      const base: ColorPalette = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
      const result = pickEvenly(base, 2)
      expect(result).toHaveLength(2)
      // Should pick first and last
      expect(result[0]).toBe('#FF0000')
      expect(result[1]).toBe('#FFFF00')
    })

    it('should cycle through base when count > base length', () => {
      const base: ColorPalette = ['#FF0000', '#00FF00', '#0000FF']
      const result = pickEvenly(base, 7)
      expect(result).toHaveLength(7)
      // Should cycle: [0, 1, 2, 0, 1, 2, 0]
      expect(result[0]).toBe('#FF0000')
      expect(result[1]).toBe('#00FF00')
      expect(result[2]).toBe('#0000FF')
      expect(result[3]).toBe('#FF0000')
      expect(result[4]).toBe('#00FF00')
      expect(result[5]).toBe('#0000FF')
      expect(result[6]).toBe('#FF0000')
    })

    it('should handle single element base', () => {
      const base: ColorPalette = ['#FF0000']
      expect(pickEvenly(base, 1)).toEqual(['#FF0000'])
      expect(pickEvenly(base, 3)).toEqual(['#FF0000', '#FF0000', '#FF0000'])
    })

    it('should distribute evenly across the range', () => {
      const base: ColorPalette = ['#000000', '#111111', '#222222', '#333333', '#444444']
      const result = pickEvenly(base, 5)
      expect(result).toEqual(base)
    })

    it('should handle large count values', () => {
      const base: ColorPalette = ['#FF0000', '#00FF00', '#0000FF']
      const result = pickEvenly(base, 100)
      expect(result).toHaveLength(100)
      // Should cycle through base
      expect(result[0]).toBe('#FF0000')
      expect(result[1]).toBe('#00FF00')
      expect(result[2]).toBe('#0000FF')
      expect(result[3]).toBe('#FF0000')
      expect(result[99]).toBe('#FF0000') // 99 % 3 = 0
    })

    it('should return correct indices for edge cases', () => {
      const base: ColorPalette = ['#a', '#b', '#c', '#d', '#e'] as ColorPalette
      // count = 1: should return middle (index 2)
      expect(pickEvenly(base, 1)).toEqual(['#c'])
      // count = 2: should return first and last
      expect(pickEvenly(base, 2)).toEqual(['#a', '#e'])
      // count = 3: should return first, middle, last
      expect(pickEvenly(base, 3)).toEqual(['#a', '#c', '#e'])
    })
  })
})

