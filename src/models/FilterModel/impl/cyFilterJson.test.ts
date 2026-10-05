// @vitest-environment node
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  ColumnFilterTarget,
  DegreeEdgeType,
  FilterPredicate,
  FilterTypeId,
  MatchType,
  NamedFilter,
} from '../FilterTree'
import {
  CyFilterParseResult,
  MAX_FILE_LENGTH,
  MAX_FILTER_CONDITIONS,
  MAX_FILTER_DEPTH,
  parseCyFilterJson,
  parseCyFilterText,
  serializeCyFilters,
  SkipReason,
} from './cyFilterJson'
import {
  createColumnFilter,
  createCompositeFilter,
  createDegreeFilter,
  createTopologyFilter,
} from './filterTreeImpl'

const FIXTURES = path.resolve(__dirname, '../../../../test/fixtures/filters')

const readFixture = (name: string): string =>
  fs.readFileSync(path.join(FIXTURES, name), 'utf-8')

const parseFixture = (name: string) => {
  const result = parseCyFilterText(readFixture(name))
  if (!result.success) throw new Error(result.error)
  return result
}

const errorOf = (result: CyFilterParseResult): string =>
  result.success ? '' : result.error

describe('parseCyFilterText', () => {
  it('reads every condition type', () => {
    const { filters, skipped } = parseFixture('all-filter-types.valid.json')
    expect(skipped).toEqual([])
    expect(filters).toHaveLength(1)
    const [filter] = filters
    expect(filter.name).toBe('Hubs with high score')
    expect(filter.root.matchType).toBe(MatchType.ALL)
    expect(filter.root.children.map((child) => child.type)).toEqual([
      FilterTypeId.Column,
      FilterTypeId.Column,
      FilterTypeId.Degree,
      FilterTypeId.Topology,
      FilterTypeId.Composite,
    ])
    expect(filter.root.children[0]).toEqual({
      ...createColumnFilter(),
      columnName: 'score',
      predicate: FilterPredicate.BETWEEN,
      criterion: [0.5, 2.75],
    })
    expect(filter.root.children[2]).toEqual({
      ...createDegreeFilter(),
      criterion: [3, 12],
    })
    expect(filter.root.children[3]).toMatchObject({
      distance: 2,
      threshold: 3,
      children: [{ columnName: 'isTF', criterion: true }],
    })
    expect(filter.root.children[4]).toMatchObject({
      matchType: MatchType.ANY,
      children: [
        {
          target: ColumnFilterTarget.EDGES,
          anyMatch: false,
          predicate: FilterPredicate.IS_NOT_BETWEEN,
        },
        { predicate: FilterPredicate.REGEX, criterion: 'pp.*' },
      ],
    })
  })

  it('reads a topology condition from Cytoscape 3.2 without "transformers"', () => {
    const { filters } = parseFixture(
      'topology-3.2-without-transformers.valid.json',
    )
    expect(filters[0].root.children).toEqual([
      {
        ...createTopologyFilter(),
        distance: 4,
        threshold: 5,
      },
      {
        ...createColumnFilter(),
        columnName: 'name',
        predicate: FilterPredicate.CONTAINS,
        criterion: '4',
      },
    ])
  })

  it('skips chains and accepts short ids', () => {
    const { filters, skipped } = parseFixture('filters-and-chains.valid.json')
    expect(filters.map((filter) => filter.name)).toEqual([
      'Default filter',
      'Short ids',
    ])
    // Several top-level conditions go into a new "match all" group
    expect(filters[1].root).toEqual(
      createCompositeFilter(MatchType.ALL, [
        {
          ...createColumnFilter(),
          columnName: 'interaction',
          target: ColumnFilterTarget.EDGES,
          predicate: FilterPredicate.IS,
          criterion: 'pp',
        },
        { ...createDegreeFilter(), criterion: [1, 1] },
      ]),
    )
    expect(
      skipped.map(({ index, name, reason }) => ({ index, name, reason })),
    ).toEqual([
      { index: 1, name: 'Default chain', reason: SkipReason.CHAIN },
      { index: 3, name: 'Interaction chain', reason: SkipReason.CHAIN },
    ])
  })

  it('skips an entry with an unknown condition and keeps the others', () => {
    const { filters, skipped } = parseFixture('unknown-filter-id.valid.json')
    expect(filters.map((filter) => filter.name)).toEqual(['Known'])
    expect(filters[0].root.children[0]).toMatchObject({ criterion: 42 })
    expect(skipped).toEqual([
      {
        index: 1,
        name: 'From an app',
        reason: SkipReason.UNKNOWN_ID,
        detail:
          '[1].transformers.0.transformers.0.id: Unknown filter "com.example.FooFilter"',
      },
    ])
  })

  it('reads conditions that are not set up yet', () => {
    const { filters } = parseFixture('unconfigured.valid.json')
    expect(filters[0].root.children).toEqual([
      createColumnFilter(),
      createDegreeFilter(),
      createTopologyFilter(),
    ])
  })

  it('rejects a file that is not an array', () => {
    expect(
      errorOf(parseCyFilterText(readFixture('not-an-array.invalid.json'))),
    ).toBe('Not a filter file: expected an array, got object')
  })

  it('skips an entry with an unknown predicate', () => {
    const result = parseFixture('bad-predicate.invalid.json')
    expect(result.filters).toEqual([])
    expect(result.skipped[0]).toMatchObject({
      reason: SkipReason.INVALID,
      name: 'Starts with',
    })
    expect(result.skipped[0].detail).toContain(
      '[0].transformers.0.transformers.0.parameters.predicate',
    )
  })

  it('keeps unknown keys, __proto__ included, out of the model', () => {
    const { filters } = parseFixture('prototype-keys.valid.json')
    expect(filters).toHaveLength(1)
    expect(filters[0].name).toBe('__proto__')
    expect(filters[0].root).toEqual(
      createCompositeFilter(MatchType.ALL, [
        {
          ...createColumnFilter(),
          columnName: '__proto__',
          predicate: FilterPredicate.IS,
          criterion: 'x',
        },
      ]),
    )
    expect(Object.getPrototypeOf(filters[0].root)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('rejects text that is not JSON or is too long', () => {
    expect(errorOf(parseCyFilterText('[{'))).toMatch(/^Not a JSON file: /)
    expect(errorOf(parseCyFilterText(' '.repeat(MAX_FILE_LENGTH + 1)))).toBe(
      `The file is larger than ${MAX_FILE_LENGTH} characters`,
    )
  })
})

describe('parseCyFilterJson', () => {
  const entry = (transformers: unknown[], name: unknown = 'F'): unknown => ({
    name,
    transformers,
  })
  const composite = (children: unknown[] = []) => ({
    id: FilterTypeId.Composite,
    parameters: { type: 'ALL' },
    transformers: children,
  })

  it('rejects conditions nested too deep, without overflowing the stack', () => {
    let node: unknown = composite()
    for (let depth = 1; depth < MAX_FILTER_DEPTH; depth++) {
      node = composite([node])
    }
    expect(parseCyFilterJson([entry([node])]).success).toBe(true)
    expect(errorOf(parseCyFilterJson([entry([composite([node])])]))).toBe(
      `Conditions are nested more than ${MAX_FILTER_DEPTH} levels deep`,
    )

    let deep: unknown = composite()
    for (let depth = 0; depth < 100_000; depth++) {
      deep = composite([deep])
    }
    expect(parseCyFilterJson([entry([deep])]).success).toBe(false)
  })

  it('rejects a file with too many conditions', () => {
    const children = Array.from({ length: MAX_FILTER_CONDITIONS }, () =>
      createColumnFilter(),
    ).map(() => ({ id: FilterTypeId.Column, parameters: {} }))
    expect(errorOf(parseCyFilterJson([entry([composite(children)])]))).toBe(
      `The file holds more than ${MAX_FILTER_CONDITIONS} conditions`,
    )
  })

  it('makes names repeated in the file unique', () => {
    const result = parseCyFilterJson([
      entry([composite()], 'A'),
      entry([composite()], 'a'),
      entry([composite()], ' A '),
    ])
    expect(
      result.success && result.filters.map((filter) => filter.name),
    ).toEqual(['A', 'a 2', 'A 3'])
  })

  it('skips malformed entries with a reason', () => {
    const result = parseCyFilterJson([
      'text',
      entry([composite()], ''),
      { name: 'No list', transformers: {} },
      entry([]),
      entry([
        {
          id: FilterTypeId.Topology,
          parameters: { distance: 1.5, threshold: 1 },
        },
      ]),
      entry([
        { id: FilterTypeId.Degree, parameters: { criterion: ['a', 'b'] } },
      ]),
      entry([{ id: FilterTypeId.Column, parameters: { anyMatch: 'yes' } }]),
      entry([
        composite([
          { id: 'org.cytoscape.AdjacencyTransformer', parameters: {} },
        ]),
      ]),
    ])
    expect(result.success && result.skipped.map((s) => s.reason)).toEqual([
      SkipReason.INVALID,
      SkipReason.INVALID,
      SkipReason.INVALID,
      SkipReason.NO_FILTER,
      SkipReason.INVALID,
      SkipReason.INVALID,
      SkipReason.INVALID,
      // A chain transformer nested in a filter is unknown there
      SkipReason.UNKNOWN_ID,
    ])
  })

  it('takes defaults for missing parameters', () => {
    const result = parseCyFilterJson([
      entry([
        { id: FilterTypeId.Column },
        { id: FilterTypeId.Degree, parameters: {} },
        { id: FilterTypeId.Topology, parameters: {} },
      ]),
    ])
    expect(result.success && result.filters[0].root.children).toEqual([
      createColumnFilter(),
      createDegreeFilter(),
      createTopologyFilter(),
    ])
  })

  it('reads a list criterion that is not a range as no criterion', () => {
    const result = parseCyFilterJson([
      entry([
        {
          id: FilterTypeId.Column,
          parameters: { criterion: ['a', 'b'], columnName: 'c' },
        },
        { id: FilterTypeId.Column, parameters: { criterion: [1, 2, 3] } },
      ]),
    ])
    expect(
      result.success &&
        result.filters[0].root.children.map((child) =>
          child.type === FilterTypeId.Column ? child.criterion : undefined,
        ),
    ).toEqual([null, [1, 2]])
  })

  it('keeps a single topology condition whole', () => {
    const result = parseCyFilterJson([
      entry([
        {
          id: FilterTypeId.Topology,
          parameters: { distance: 1, threshold: 2, type: 'ANY' },
          transformers: [],
        },
      ]),
    ])
    expect(result.success && result.filters[0].root).toEqual(
      createCompositeFilter(MatchType.ALL, [
        {
          ...createTopologyFilter(),
          distance: 1,
          threshold: 2,
          matchType: MatchType.ANY,
        },
      ]),
    )
  })
})

describe('serializeCyFilters', () => {
  // Same keys in the same order, whitespace aside
  const canonical = (text: string): string => JSON.stringify(JSON.parse(text))

  it('writes a Cytoscape Desktop file back unchanged', () => {
    ;['all-filter-types.valid.json', 'unconfigured.valid.json'].forEach(
      (name) => {
        const text = readFixture(name)
        expect(canonical(serializeCyFilters(parseFixture(name).filters))).toBe(
          canonical(text),
        )
      },
    )
  })

  it('writes keys in the order Cytoscape Desktop reads them', () => {
    const filter: NamedFilter = {
      name: 'F',
      root: createCompositeFilter(MatchType.ANY, [
        {
          ...createTopologyFilter(),
          children: [
            { ...createDegreeFilter(), edgeType: DegreeEdgeType.OUTGOING },
          ],
        },
      ]),
    }
    const [written] = JSON.parse(serializeCyFilters([filter])) as Record<
      string,
      unknown
    >[]
    expect(Object.keys(written)).toEqual(['name', 'transformers'])
    const [root] = written.transformers as Record<string, unknown>[]
    expect(Object.keys(root)).toEqual(['id', 'parameters', 'transformers'])
    const [topology] = root.transformers as Record<string, unknown>[]
    expect(Object.keys(topology)).toEqual(['id', 'parameters', 'transformers'])
    const [degree] = topology.transformers as Record<string, unknown>[]
    expect(Object.keys(degree)).toEqual(['id', 'parameters'])
  })

  it('round-trips through parse', () => {
    const filters: NamedFilter[] = parseFixture(
      'all-filter-types.valid.json',
    ).filters
    const again = parseCyFilterText(serializeCyFilters(filters))
    expect(again.success && again.filters).toEqual(filters)
  })

  it('does not write CW-only state', () => {
    const text = serializeCyFilters([
      {
        name: 'F',
        root: createCompositeFilter(),
        displayMode: 'select',
      } as NamedFilter,
    ])
    expect(text).not.toContain('displayMode')
  })
})
