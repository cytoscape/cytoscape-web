// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { DEFAULT_STYLE_NAME, VisualStyleSet } from '../VisualStyleSet'
import { createVisualStyle } from './visualStyleFnImpl'
import {
  cloneVisualStyle,
  createStyleId,
  createStyleSet,
  getActiveStyle,
  isValidStyleSet,
  isValidVisualStyle,
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

describe('isValidVisualStyle', () => {
  it('should accept a style built by the host', () => {
    expect(isValidVisualStyle(createVisualStyle())).toBe(true)
  })

  it('should accept a style carrying a mapping', () => {
    const style = createVisualStyle()
    style.nodeLabel.mapping = {
      type: MappingFunctionType.Passthrough,
      attribute: 'name',
      visualPropertyType: 'string',
      defaultValue: '',
    }
    expect(isValidVisualStyle(style)).toBe(true)
  })

  it('should accept a style carrying unknown extra fields', () => {
    // A runtime style object does carry fields the VisualStyle type does not
    // describe; visualStyleApi.getVisualProperties skips them the same way.
    const style: any = createVisualStyle()
    style.someInternalField = { whatever: true }
    expect(isValidVisualStyle(style)).toBe(true)
  })

  it('should reject non-objects', () => {
    expect(isValidVisualStyle(undefined)).toBe(false)
    expect(isValidVisualStyle(null)).toBe(false)
    expect(isValidVisualStyle('nodeShape')).toBe(false)
    expect(isValidVisualStyle(42)).toBe(false)
    expect(isValidVisualStyle([])).toBe(false)
  })

  it('should reject an object holding no visual property at all', () => {
    expect(isValidVisualStyle({})).toBe(false)
    expect(isValidVisualStyle({ someInternalField: 1 })).toBe(false)
  })

  it('should reject a property that is not an object', () => {
    expect(isValidVisualStyle({ nodeShape: 'diamond' })).toBe(false)
  })

  it('should reject a property with a missing or unknown group', () => {
    expect(
      isValidVisualStyle({
        nodeShape: { type: 'nodeShape', defaultValue: 'ellipse' },
      }),
    ).toBe(false)
    expect(
      isValidVisualStyle({
        nodeShape: {
          group: 'hyperedge',
          type: 'nodeShape',
          defaultValue: 'ellipse',
        },
      }),
    ).toBe(false)
  })

  it('should reject a property with no type or no defaultValue', () => {
    expect(
      isValidVisualStyle({
        nodeShape: { group: 'node', defaultValue: 'ellipse' },
      }),
    ).toBe(false)
    expect(
      isValidVisualStyle({ nodeShape: { group: 'node', type: 'nodeShape' } }),
    ).toBe(false)
  })

  it('should reject a malformed mapping', () => {
    const base = {
      group: 'node',
      type: 'string',
      defaultValue: '',
    }
    expect(
      isValidVisualStyle({ nodeLabel: { ...base, mapping: 'passthrough' } }),
    ).toBe(false)
    expect(
      isValidVisualStyle({
        nodeLabel: { ...base, mapping: { type: 'quadratic', attribute: 'x' } },
      }),
    ).toBe(false)
    expect(
      isValidVisualStyle({
        nodeLabel: {
          ...base,
          mapping: { type: MappingFunctionType.Discrete },
        },
      }),
    ).toBe(false)
  })

  it('should ignore bypassMap, which every consumer strips', () => {
    const style: any = createVisualStyle()
    style.nodeShape.bypassMap = { 'not-a': 'map' }
    expect(isValidVisualStyle(style)).toBe(true)
  })
})
