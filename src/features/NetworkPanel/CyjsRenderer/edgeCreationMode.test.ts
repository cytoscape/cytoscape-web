// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  EDGE_CREATION_ATTR,
  EDGE_CREATION_MODE_OFF,
  isEdgeCreationActive,
  isEdgeCreationTarget,
  resolveEdgeCreationTap,
} from './edgeCreationMode'

describe('resolveEdgeCreationTap', () => {
  it('returns null when the mode is inactive', () => {
    expect(resolveEdgeCreationTap(EDGE_CREATION_MODE_OFF, 'n1')).toBeNull()
  })

  it('returns null when there is no source node', () => {
    expect(
      resolveEdgeCreationTap({ active: true, sourceNodeId: null }, 'n1'),
    ).toBeNull()
  })

  it('returns null when the tapped element is not a node', () => {
    expect(
      resolveEdgeCreationTap({ active: true, sourceNodeId: 'n1' }, null),
    ).toBeNull()
  })

  it('resolves a tap on another node into an edge', () => {
    expect(
      resolveEdgeCreationTap({ active: true, sourceNodeId: 'n1' }, 'n2'),
    ).toEqual({ sourceNodeId: 'n1', targetNodeId: 'n2' })
  })

  it('resolves a tap on the source node into a self-loop', () => {
    expect(
      resolveEdgeCreationTap({ active: true, sourceNodeId: 'n1' }, 'n1'),
    ).toEqual({ sourceNodeId: 'n1', targetNodeId: 'n1' })
  })
})

describe('isEdgeCreationTarget', () => {
  it('is false when the mode is inactive', () => {
    expect(isEdgeCreationTarget(EDGE_CREATION_MODE_OFF, 'n1')).toBe(false)
  })

  it('is true for a node other than the source', () => {
    expect(
      isEdgeCreationTarget({ active: true, sourceNodeId: 'n1' }, 'n2'),
    ).toBe(true)
  })

  it('is true for the source node itself, so self-loops can be previewed', () => {
    expect(
      isEdgeCreationTarget({ active: true, sourceNodeId: 'n1' }, 'n1'),
    ).toBe(true)
  })
})

describe('isEdgeCreationActive', () => {
  // A document that has one element, matching `selector` or not
  const docWith = (attribute: string | null): Document =>
    ({
      querySelector: (selector: string) =>
        attribute !== null && selector === `[${attribute}="true"]` ? {} : null,
    }) as unknown as Document

  it('is true while a renderer container carries the attribute', () => {
    expect(isEdgeCreationActive(docWith(EDGE_CREATION_ATTR))).toBe(true)
  })

  it('is false otherwise', () => {
    expect(isEdgeCreationActive(docWith(null))).toBe(false)
  })
})
