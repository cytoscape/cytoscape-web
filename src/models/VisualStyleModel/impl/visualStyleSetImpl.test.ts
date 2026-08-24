// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { DEFAULT_STYLE_NAME, VisualStyleSet } from '../VisualStyleSet'
import { createVisualStyle } from './visualStyleFnImpl'
import {
  cloneVisualStyle,
  createStyleId,
  createStyleSet,
  getActiveStyle,
  isValidStyleSet,
  stripBypasses,
  uniqueStyleName,
} from './visualStyleSetImpl'

describe('cloneVisualStyle', () => {
  it('should produce a deep copy sharing no references', () => {
    const original = createVisualStyle()
    original.nodeShape.defaultValue = 'diamond'
    original.nodeBackgroundColor.bypassMap.set('node-1', '#FF0000')

    const clone = cloneVisualStyle(original)

    expect(clone).not.toBe(original)
    expect(clone.nodeShape.defaultValue).toBe('diamond')
    expect(clone.nodeBackgroundColor.bypassMap.get('node-1')).toBe('#FF0000')

    // Mutating the clone must not leak into the original
    clone.nodeShape.defaultValue = 'ellipse'
    clone.nodeBackgroundColor.bypassMap.set('node-2', '#00FF00')
    expect(original.nodeShape.defaultValue).toBe('diamond')
    expect(original.nodeBackgroundColor.bypassMap.has('node-2')).toBe(false)
  })

  it('should clone discrete mapping vpValueMap as an independent Map', () => {
    const original = createVisualStyle()
    original.nodeShape.mapping = {
      type: 'discrete',
      attribute: 'type',
      vpValueMap: new Map([['a', 'ellipse']]),
      visualPropertyType: original.nodeShape.type,
      defaultValue: original.nodeShape.defaultValue,
    } as any

    const clone = cloneVisualStyle(original)
    const clonedMapping = clone.nodeShape.mapping as any
    expect(clonedMapping.vpValueMap).toBeInstanceOf(Map)
    expect(clonedMapping.vpValueMap.get('a')).toBe('ellipse')

    clonedMapping.vpValueMap.set('b', 'diamond')
    expect((original.nodeShape.mapping as any).vpValueMap.has('b')).toBe(false)
  })
})

describe('stripBypasses', () => {
  it('should remove all bypasses without touching the source', () => {
    const original = createVisualStyle()
    original.nodeBackgroundColor.bypassMap.set('node-1', '#FF0000')
    original.edgeLineColor.bypassMap.set('edge-1', '#0000FF')

    const stripped = stripBypasses(original)

    expect(stripped.nodeBackgroundColor.bypassMap.size).toBe(0)
    expect(stripped.edgeLineColor.bypassMap.size).toBe(0)
    expect(original.nodeBackgroundColor.bypassMap.size).toBe(1)
  })
})

describe('createStyleSet', () => {
  it('should wrap a style as a single-entry set with the default name', () => {
    const visualStyle = createVisualStyle()
    const styleSet = createStyleSet(visualStyle)

    const entries = Object.values(styleSet.styles)
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe(DEFAULT_STYLE_NAME)
    expect(entries[0].id).toBe(styleSet.activeStyleId)
    expect(entries[0].visualStyle).toBe(visualStyle)
    expect(isValidStyleSet(styleSet)).toBe(true)
  })

  it('should generate unique ids', () => {
    const a = createStyleSet(createVisualStyle())
    const b = createStyleSet(createVisualStyle())
    expect(a.activeStyleId).not.toBe(b.activeStyleId)
  })
})

describe('getActiveStyle', () => {
  it('should resolve the active entry', () => {
    const styleSet = createStyleSet(createVisualStyle(), 'My Style')
    expect(getActiveStyle(styleSet)?.name).toBe('My Style')
  })

  it('should return undefined for a dangling active pointer', () => {
    const styleSet = createStyleSet(createVisualStyle())
    const broken: VisualStyleSet = { ...styleSet, activeStyleId: 'missing' }
    expect(getActiveStyle(broken)).toBeUndefined()
  })
})

describe('isValidStyleSet', () => {
  it('should reject an empty set', () => {
    expect(
      isValidStyleSet({ activeStyleId: 'x', styles: {} } as VisualStyleSet),
    ).toBe(false)
  })

  it('should reject a dangling active pointer', () => {
    const styleSet = createStyleSet(createVisualStyle())
    expect(isValidStyleSet({ ...styleSet, activeStyleId: 'nope' })).toBe(false)
  })

  it('should reject entries whose key does not match their id', () => {
    const visualStyle = createVisualStyle()
    const id = createStyleId()
    expect(
      isValidStyleSet({
        activeStyleId: id,
        styles: { [id]: { id: 'other', name: 'x', visualStyle } },
      }),
    ).toBe(false)
  })

  it('should reject entries without content', () => {
    const id = createStyleId()
    expect(
      isValidStyleSet({
        activeStyleId: id,
        styles: { [id]: { id, name: 'x', visualStyle: undefined as any } },
      }),
    ).toBe(false)
  })
})

describe('uniqueStyleName', () => {
  it('should return the base name when unique', () => {
    expect(uniqueStyleName('Publication', ['Default'])).toBe('Publication')
  })

  it('should append a counter on collision', () => {
    expect(uniqueStyleName('Style', ['Style'])).toBe('Style 2')
    expect(uniqueStyleName('Style', ['Style', 'Style 2'])).toBe('Style 3')
  })

  it('should fall back to the default name for blank input', () => {
    expect(uniqueStyleName('   ', [])).toBe(DEFAULT_STYLE_NAME)
    expect(uniqueStyleName('', [DEFAULT_STYLE_NAME])).toBe(
      `${DEFAULT_STYLE_NAME} 2`,
    )
  })

  it('should trim whitespace', () => {
    expect(uniqueStyleName('  My Style  ', [])).toBe('My Style')
  })
})
