// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { describeSearchResult, SearchView } from './searchResultSummary'

const result = (
  overrides: Partial<Parameters<typeof describeSearchResult>[0]> = {},
): Parameters<typeof describeSearchResult>[0] => ({
  query: 'BRCA1',
  nodeCount: 2,
  edgeCount: 13,
  searchedNodes: true,
  searchedEdges: true,
  view: undefined,
  ...overrides,
})

describe('describeSearchResult', () => {
  it('counts nodes and edges when both were searched', () => {
    expect(describeSearchResult(result())).toEqual({
      label: '2 nodes · 13 edges',
      compactLabel: '2 · 13',
      sentence: '2 nodes and 13 edges selected.',
    })
  })

  it('uses the singular for a count of one', () => {
    expect(
      describeSearchResult(result({ nodeCount: 1, edgeCount: 1 })),
    ).toEqual({
      label: '1 node · 1 edge',
      compactLabel: '1 · 1',
      sentence: '1 node and 1 edge selected.',
    })
  })

  it('lists only nodes for a node-only search', () => {
    expect(
      describeSearchResult(
        result({ searchedEdges: false, nodeCount: 2, edgeCount: 0 }),
      ),
    ).toEqual({
      label: '2 nodes',
      compactLabel: '2',
      sentence: '2 nodes selected.',
    })
  })

  it('lists only edges for an edge-only search', () => {
    expect(
      describeSearchResult(
        result({ searchedNodes: false, nodeCount: 0, edgeCount: 13 }),
      ),
    ).toEqual({
      label: '13 edges',
      compactLabel: '13',
      sentence: '13 edges selected.',
    })
  })

  it('keeps a zero count of one type when the other matched', () => {
    expect(describeSearchResult(result({ edgeCount: 0 })).label).toBe(
      '2 nodes · 0 edges',
    )
  })

  it('says "No matches" when nothing matched', () => {
    expect(
      describeSearchResult(result({ nodeCount: 0, edgeCount: 0 })),
    ).toEqual({
      label: 'No matches',
      compactLabel: 'No matches',
      sentence: 'No matches for "BRCA1".',
    })
  })

  it.each<[SearchView, string, string]>([
    [
      'subnetwork',
      '2 nodes and 13 edges selected in the subnetwork view.',
      'No matches for "BRCA1" in the subnetwork view.',
    ],
    [
      'main',
      '2 nodes and 13 edges selected in the main network view.',
      'No matches for "BRCA1" in the main network view.',
    ],
  ])('names the %s view in the sentence only', (view, found, none) => {
    const summary = describeSearchResult(result({ view }))
    expect(summary.sentence).toBe(found)
    expect(summary.label).toBe('2 nodes · 13 edges')
    expect(
      describeSearchResult(result({ view, nodeCount: 0, edgeCount: 0 }))
        .sentence,
    ).toBe(none)
  })
})
