// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { OpaqueAspects } from '../../../models/OpaqueAspectModel'
import { mergeOpaqueAspects, toOpaqueAspectsArray } from './mergeOpaqueAspects'

describe('mergeOpaqueAspects (CW-522)', () => {
  it('returns an empty map for no sources / all empty', () => {
    expect(mergeOpaqueAspects([])).toEqual({})
    expect(mergeOpaqueAspects([undefined, null])).toEqual({})
    expect(mergeOpaqueAspects([{}, {}])).toEqual({})
  })

  it('carries a single source through unchanged', () => {
    const a: OpaqueAspects = { cyTableColumn: [{ x: 1 }, { x: 2 }] }
    expect(mergeOpaqueAspects([a])).toEqual({
      cyTableColumn: [{ x: 1 }, { x: 2 }],
    })
  })

  it('concatenates the same aspect key across sources', () => {
    const a: OpaqueAspects = { cyTableColumn: [{ x: 1 }] }
    const b: OpaqueAspects = { cyTableColumn: [{ x: 2 }] }
    expect(mergeOpaqueAspects([a, b])).toEqual({
      cyTableColumn: [{ x: 1 }, { x: 2 }],
    })
  })

  it('unions different aspect keys from different sources', () => {
    const a: OpaqueAspects = { aspectA: [{ x: 1 }] }
    const b: OpaqueAspects = { aspectB: [{ y: 2 }] }
    expect(mergeOpaqueAspects([a, b])).toEqual({
      aspectA: [{ x: 1 }],
      aspectB: [{ y: 2 }],
    })
  })

  it('de-duplicates exact deep-equal entries across sources', () => {
    const a: OpaqueAspects = { cyTableColumn: [{ x: 1 }, { x: 2 }] }
    const b: OpaqueAspects = { cyTableColumn: [{ x: 2 }, { x: 3 }] }
    expect(mergeOpaqueAspects([a, b])).toEqual({
      cyTableColumn: [{ x: 1 }, { x: 2 }, { x: 3 }],
    })
  })

  it('treats deep-equal objects with different key order as duplicates', () => {
    const a: OpaqueAspects = { asp: [{ x: 1, y: 2 }] }
    const b: OpaqueAspects = { asp: [{ y: 2, x: 1 }] }
    expect(mergeOpaqueAspects([a, b])).toEqual({ asp: [{ x: 1, y: 2 }] })
  })

  it('distinguishes non-equal entries that stringify differently', () => {
    const a: OpaqueAspects = { asp: [{ x: 1 }] }
    const b: OpaqueAspects = { asp: [{ x: '1' }] }
    const result = mergeOpaqueAspects([a, b])
    expect(result.asp).toHaveLength(2)
  })

  it('dedupes primitive and array entries too', () => {
    const a: OpaqueAspects = { tags: ['a', 'b'], nested: [[1, 2]] }
    const b: OpaqueAspects = { tags: ['b', 'c'], nested: [[1, 2], [3]] }
    expect(mergeOpaqueAspects([a, b])).toEqual({
      tags: ['a', 'b', 'c'],
      nested: [[1, 2], [3]],
    })
  })

  it('ignores non-array aspect values defensively', () => {
    const a = { good: [{ x: 1 }], bad: 'not-an-array' as any }
    expect(mergeOpaqueAspects([a])).toEqual({ good: [{ x: 1 }] })
  })

  describe('toOpaqueAspectsArray', () => {
    it('converts a map into array-of-single-key-objects form', () => {
      const merged: OpaqueAspects = {
        aspectA: [{ x: 1 }],
        aspectB: [{ y: 2 }],
      }
      expect(toOpaqueAspectsArray(merged)).toEqual([
        { aspectA: [{ x: 1 }] },
        { aspectB: [{ y: 2 }] },
      ])
    })

    it('returns [] for an empty map', () => {
      expect(toOpaqueAspectsArray({})).toEqual([])
    })
  })
})
