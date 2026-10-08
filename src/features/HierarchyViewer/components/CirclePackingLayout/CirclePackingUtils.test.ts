// @vitest-environment node
import type * as d3Hierarchy from 'd3-hierarchy'
import { describe, expect, it } from 'vitest'

import type { CirclePackingView } from '../../model/CirclePackingView'
import {
  getFontSize,
  getLabel,
  getWordLines,
  LETTERS_PER_LINE,
} from './CirclePackingUtils'
import type { D3TreeNode } from './D3TreeNode'

describe('getWordLines', () => {
  it('keeps a single word on one line', () => {
    expect(getWordLines('MAPK1')).toEqual(['MAPK1'])
  })

  it('joins space-separated words with commas within the line limit', () => {
    expect(getWordLines('aaa bbb ccc')).toEqual(['aaa, bbb, ccc'])
  })

  it('wraps space-separated words that exceed the line limit', () => {
    const lines = getWordLines('alpha beta gamma delta epsilon zeta')

    expect(lines.length).toBeGreaterThan(1)
    lines.forEach((line) => {
      expect(line.length).toBeLessThanOrEqual(LETTERS_PER_LINE + 2)
    })
  })

  it('splits comma- or pipe-separated entries into wrapped lines', () => {
    expect(getWordLines('geneA,geneB')).toEqual(['geneA, geneB'])
    expect(getWordLines('geneA|geneB')).toEqual(['geneA, geneB'])
  })
})

describe('getLabel', () => {
  const cpViewWith = (label?: string): CirclePackingView =>
    ({
      nodeViews: {
        node1: { values: new Map(label ? [['nodeLabel', label]] : []) },
      },
    }) as unknown as CirclePackingView

  it('prefers the nodeLabel from the view model', () => {
    expect(getLabel('node1', cpViewWith('Subsystem A'), 'fallback')).toBe(
      'Subsystem A',
    )
  })

  it('falls back to the default name when no label exists', () => {
    expect(getLabel('node1', cpViewWith(), 'fallback')).toBe('fallback')
    expect(getLabel('missing', cpViewWith('x'), 'fallback')).toBe('fallback')
  })

  it('returns an empty string when neither label nor default exists', () => {
    expect(getLabel('node1', cpViewWith(), '')).toBe('')
  })

  it('truncates labels longer than 90 characters with an ellipsis', () => {
    const long = 'x'.repeat(120)

    const label = getLabel('node1', cpViewWith(long), 'fallback')

    expect(label).toHaveLength(93)
    expect(label.endsWith('...')).toBe(true)
  })
})

describe('getFontSize', () => {
  const circle = (r: number) =>
    ({ r }) as unknown as d3Hierarchy.HierarchyCircularNode<D3TreeNode>

  it('sizes short labels to fill one line', () => {
    // width = 2r * 1.15; a 5-letter label on one line beats the base size
    expect(getFontSize(circle(10), 'abcde')).toBeCloseTo(23 / 5)
  })

  it('never drops below the base (wrapped) size for long labels', () => {
    const long = 'x'.repeat(60)

    expect(getFontSize(circle(10), long)).toBeCloseTo(23 / LETTERS_PER_LINE)
  })
})
