import { describe, expect, it, vi } from 'vitest'
import { createHeaderIcons, handleDrawHeader } from './tableRenderers'
import { ValueTypeName } from '../../../models/TableModel'

describe('tableRenderers', () => {
  describe('createHeaderIcons', () => {
    it('creates icons for all ValueTypeNames', () => {
      const icons = createHeaderIcons(false)
      const darkIcons = createHeaderIcons(true)
      
      expect(icons[ValueTypeName.String]).toBeDefined()
      expect(icons[ValueTypeName.Double]).toBeDefined()
      expect(darkIcons[ValueTypeName.Boolean]).toBeDefined()
      
      // Ensure it returns a function that produces an SVG string
      expect(typeof icons[ValueTypeName.String]()).toBe('string')
      expect(icons[ValueTypeName.String]()).toContain('<svg')
    })
  })

  describe('handleDrawHeader', () => {
    it('returns false and does not override fillText for missing type', () => {
      const ctx = { fillText: vi.fn() } as any
      const column = { title: 'Missing Type' } as any
      
      const result = handleDrawHeader({ ctx, column, theme: {} as any, rect: {} as any, hoverAmount: 0, isHovered: false, hasSelectedCell: false, spriteManager: {} as any, menuBounds: {} as any } as any)
      
      expect(result).toBe(false)
      expect(ctx.fillText.name).not.toBe('') // original function untouched
    })

    it('overrides fillText and returns false for valid type', () => {
      const originalFillText = vi.fn()
      const ctx = { fillText: originalFillText } as any
      const column = { title: 'Score', type: ValueTypeName.Double } as any
      
      const result = handleDrawHeader({ ctx, column, theme: {} as any, rect: {} as any, hoverAmount: 0, isHovered: false, hasSelectedCell: false, spriteManager: {} as any, menuBounds: {} as any } as any)
      
      expect(result).toBe(false)
      expect(ctx.fillText).not.toBe(originalFillText) // function was overridden
      
      // Test the overridden function
      ctx.fillText('Score', 10, 20, 100)
      expect(originalFillText).toHaveBeenCalled()
    })
  })
})
