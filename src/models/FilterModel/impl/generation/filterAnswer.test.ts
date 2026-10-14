// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { Table } from '../../../TableModel/Table'
import type { ValueTypeName } from '../../../TableModel/ValueTypeName'
import { DisplayMode } from '../../DisplayMode'
import {
  ColumnFilterTarget,
  DegreeEdgeType,
  FilterPredicate,
  FilterTypeId,
  MatchType,
} from '../../FilterTree'
import {
  checkGeneratedFilter,
  cutText,
  DEFAULT_GENERATED_FILTER_NAME,
  FILTER_ANSWER_JSON_SCHEMA,
  FilterAnswer,
  GenerationMode,
  MAX_ANSWER_LENGTH,
  MAX_GENERATED_CONDITIONS,
  MAX_MODEL_TEXT_LENGTH,
  MAX_NAME_LENGTH,
  readFilterAnswer,
} from './filterAnswer'

const table = (columns: Record<string, ValueTypeName>): Table => ({
  id: 'table',
  columns: Object.entries(columns).map(([name, type]) => ({ name, type })),
  rows: new Map(),
})

const NODES = table({
  name: 'string',
  score: 'double',
  hub: 'boolean',
  go: 'list_of_string',
  flags: 'list_of_boolean',
})
const EDGES = table({ interaction: 'string', weight: 'double' })

const columnCondition = (parameters: Record<string, unknown>) => ({
  id: FilterTypeId.Column,
  parameters: {
    caseSensitive: false,
    type: 'nodes',
    anyMatch: true,
    ...parameters,
  },
})

const groupOf = (...transformers: unknown[]) => ({
  id: FilterTypeId.Composite,
  parameters: { type: 'ALL' },
  transformers,
})

const SCORE = columnCondition({
  columnName: 'score',
  predicate: 'BETWEEN',
  criterion: [0.5, 2],
})
const NAME = columnCondition({
  columnName: 'name',
  predicate: 'CONTAINS',
  criterion: 'kinase',
})
const DEGREE = {
  id: FilterTypeId.Degree,
  parameters: { predicate: 'BETWEEN', criterion: [3, 10], edgeType: 'ANY' },
}

const answer = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    outcome: 'filter',
    mode: 'select',
    name: 'High scores',
    explanation: 'Nodes with a high score.',
    reason: null,
    transformers: [groupOf(SCORE, DEGREE)],
    ...overrides,
  })

const read = (text: string): FilterAnswer =>
  readFilterAnswer(text, NODES, EDGES)

const problemsOf = (text: string): string[] => {
  const result = read(text)
  if (result.kind !== 'problems') {
    throw new Error(`Expected problems, got ${result.kind}`)
  }
  return result.problems
}

describe('readFilterAnswer', () => {
  it('reads a filter answer', () => {
    const result = read(answer())
    expect(result).toEqual({
      kind: 'filter',
      filter: {
        name: 'High scores',
        root: {
          type: FilterTypeId.Composite,
          matchType: MatchType.ALL,
          children: [
            {
              type: FilterTypeId.Column,
              columnName: 'score',
              target: ColumnFilterTarget.NODES,
              predicate: FilterPredicate.BETWEEN,
              criterion: [0.5, 2],
              caseSensitive: false,
              anyMatch: true,
            },
            {
              type: FilterTypeId.Degree,
              edgeType: DegreeEdgeType.ANY,
              predicate: FilterPredicate.BETWEEN,
              criterion: [3, 10],
            },
          ],
        },
      },
      mode: GenerationMode.SELECT,
      displayMode: DisplayMode.SELECT,
      explanation: 'Nodes with a high score.',
    })
  })

  it('wraps several top-level conditions in a match-all group', () => {
    const result = read(answer({ transformers: [SCORE, NAME] }))
    expect(result.kind === 'filter' && result.filter.root).toMatchObject({
      matchType: MatchType.ALL,
      children: [{ columnName: 'score' }, { columnName: 'name' }],
    })
  })

  it('shows only the matches in show mode', () => {
    const result = read(answer({ mode: 'show' }))
    expect(result).toMatchObject({
      kind: 'filter',
      mode: GenerationMode.SHOW,
      displayMode: DisplayMode.SHOW_HIDE,
      filter: { root: { children: [{ predicate: 'BETWEEN' }, {}] } },
    })
  })

  it('negates the conditions in hide mode', () => {
    const result = read(answer({ mode: 'hide' }))
    expect(result).toMatchObject({
      kind: 'filter',
      mode: GenerationMode.HIDE,
      displayMode: DisplayMode.SHOW_HIDE,
      filter: {
        root: {
          matchType: MatchType.ANY,
          children: [
            { predicate: 'IS_NOT_BETWEEN' },
            { predicate: 'IS_NOT_BETWEEN' },
          ],
        },
      },
    })
  })

  it('reads an unsupported answer', () => {
    expect(
      read(
        JSON.stringify({
          outcome: 'unsupported',
          mode: null,
          name: null,
          explanation: null,
          reason: '  Filters cannot rank nodes.  ',
          transformers: null,
        }),
      ),
    ).toEqual({ kind: 'unsupported', reason: 'Filters cannot rank nodes.' })
  })

  describe('finds the JSON', () => {
    it('in a Markdown code fence', () => {
      expect(read(`\`\`\`json\n${answer()}\n\`\`\``).kind).toBe('filter')
    })

    it('among prose', () => {
      expect(read(`Here is your filter: ${answer()} Enjoy!`).kind).toBe(
        'filter',
      )
    })

    it.each([
      ['no JSON', 'I cannot do that.'],
      ['an array', '[1, 2]'],
      ['a string', '"filter"'],
      ['null', 'null'],
      ['broken JSON', '{"outcome": "filter",'],
    ])('and refuses %s', (_, text) => {
      expect(problemsOf(text)).toEqual(['The answer is not one JSON object.'])
    })
  })

  describe('reads model text as plain, bounded text', () => {
    it('cuts the name and the explanation', () => {
      const result = read(
        answer({
          name: 'n'.repeat(MAX_NAME_LENGTH + 50),
          explanation: 'e'.repeat(MAX_MODEL_TEXT_LENGTH + 50),
        }),
      )
      expect(result.kind).toBe('filter')
      if (result.kind !== 'filter') return
      expect(Array.from(result.filter.name)).toHaveLength(MAX_NAME_LENGTH)
      expect(result.filter.name.endsWith('…')).toBe(true)
      expect(Array.from(result.explanation)).toHaveLength(MAX_MODEL_TEXT_LENGTH)
    })

    it.each([null, '', '   '])('names a filter without a name (%j)', (name) => {
      const result = read(answer({ name }))
      expect(result.kind === 'filter' && result.filter.name).toBe(
        DEFAULT_GENERATED_FILTER_NAME,
      )
    })

    it('keeps markup as text', () => {
      const result = read(
        answer({ explanation: '<img src=x onerror=alert(1)>' }),
      )
      expect(result.kind === 'filter' && result.explanation).toBe(
        '<img src=x onerror=alert(1)>',
      )
    })
  })

  describe('reports what is wrong', () => {
    it('with the envelope', () => {
      expect(problemsOf(answer({ outcome: 'maybe' }))[0]).toMatch(/^"outcome"/)
      expect(problemsOf(answer({ mode: null }))).toEqual([
        '"mode" must be "select", "show" or "hide".',
      ])
      expect(problemsOf(answer({ mode: 'toggle' }))[0]).toMatch(/^"mode"/)
      expect(problemsOf(answer({ transformers: null }))).toEqual([
        '"transformers" must hold the conditions.',
      ])
      expect(problemsOf(answer({ transformers: 'all' }))[0]).toMatch(
        /^"transformers"/,
      )
    })

    it('with the conditions, as the file parser reads them', () => {
      expect(
        problemsOf(answer({ transformers: [{ id: 'org.example.Mine' }] }))[0],
      ).toMatch(/Unknown filter "org.example.Mine"/)
      expect(
        problemsOf(
          answer({
            transformers: [
              columnCondition({ columnName: 'name', predicate: 'MATCHES' }),
            ],
          }),
        )[0],
      ).toMatch(/predicate/)
      expect(problemsOf(answer({ transformers: [] }))).toEqual([
        '[0]: Holds no filter',
      ])
    })

    it('with conditions the network cannot run', () => {
      expect(
        problemsOf(
          answer({
            transformers: [
              columnCondition({
                columnName: 'nope',
                predicate: 'IS',
                criterion: 'x',
              }),
            ],
          }),
        ),
      ).toEqual([
        'The condition on node column "nope": Node table does not have column "nope".',
      ])
      expect(
        problemsOf(
          answer({
            transformers: [
              columnCondition({
                columnName: 'name',
                predicate: 'BETWEEN',
                criterion: [1, 2],
              }),
            ],
          }),
        )[0],
      ).toMatch(/is a String column/)
    })

    it(`refuses an answer over ${MAX_ANSWER_LENGTH} characters unread`, () => {
      expect(
        problemsOf(answer({ explanation: 'x'.repeat(MAX_ANSWER_LENGTH) })),
      ).toEqual([`The answer is longer than ${MAX_ANSWER_LENGTH} characters.`])
    })
  })

  describe('treats the answer as untrusted input', () => {
    it('keeps only the envelope keys and ignores prototype keys', () => {
      const text = `{"__proto__": {"outcome": "unsupported"}, "constructor": {"prototype": {"x": 1}}, ${answer().slice(1)}`
      const result = read(text)
      expect(result.kind).toBe('filter')
      expect(({} as Record<string, unknown>).outcome).toBeUndefined()
      expect(({} as Record<string, unknown>).x).toBeUndefined()
    })

    it('does not let parameters reach the model through __proto__', () => {
      const result = read(
        answer({
          transformers: [
            JSON.parse(
              '{"id": "org.cytoscape.ColumnFilter", "parameters": {"__proto__": {"predicate": "REGEX"}, "columnName": "name", "predicate": "IS", "criterion": "x", "type": "nodes", "caseSensitive": false, "anyMatch": true}}',
            ),
          ],
        }),
      )
      expect(result).toMatchObject({
        kind: 'filter',
        filter: { root: { children: [{ predicate: 'IS' }] } },
      })
    })

    it('refuses REGEX', () => {
      expect(
        problemsOf(
          answer({
            transformers: [
              columnCondition({
                columnName: 'name',
                predicate: 'REGEX',
                criterion: '(a+)+$',
              }),
            ],
          }),
        ),
      ).toEqual([
        'The condition on node column "name" uses REGEX, which is not allowed. Use CONTAINS or IS.',
      ])
    })

    it('refuses deep nesting', () => {
      let condition: unknown = SCORE
      for (let i = 0; i < 40; i++) condition = groupOf(condition)
      expect(problemsOf(answer({ transformers: [condition] }))[0]).toMatch(
        /nested more than/,
      )
    })
  })
})

describe('checkGeneratedFilter', () => {
  const check = (
    text: string,
    mode: GenerationMode = GenerationMode.SELECT,
  ): string[] => {
    // Read through the parser in select mode, then check in the given mode
    const result = readFilterAnswer(
      answer({ transformers: JSON.parse(text) }),
      NODES,
      EDGES,
    )
    if (result.kind === 'filter') {
      return checkGeneratedFilter(result.filter.root, mode, NODES, EDGES)
    }
    return result.kind === 'problems' ? result.problems : []
  }

  it('accepts what the FILTER tab can edit', () => {
    expect(check(JSON.stringify([SCORE, NAME, DEGREE]))).toEqual([])
  })

  it.each([
    [
      'a filter without conditions',
      [groupOf()],
      'The filter has no condition.',
    ],
    ['an empty group', [NAME, groupOf()], 'A group is empty.'],
    [
      'a column without a criterion',
      [columnCondition({ columnName: 'name', predicate: 'IS' })],
      'The condition on node column "name" needs a columnName, a predicate and a criterion.',
    ],
    [
      'both tables',
      [
        columnCondition({
          columnName: 'name',
          predicate: 'IS',
          criterion: 'x',
          type: 'nodes+edges',
        }),
      ],
      'The condition on node column "name" must have "type" "nodes" or "edges".',
    ],
    [
      'case-sensitive text',
      [
        columnCondition({
          columnName: 'name',
          predicate: 'IS',
          criterion: 'x',
          caseSensitive: true,
        }),
      ],
      'The condition on node column "name" must have "caseSensitive" false.',
    ],
    [
      'a single-value number comparison',
      [
        columnCondition({
          columnName: 'score',
          predicate: 'GREATER_THAN',
          criterion: 0.5,
        }),
      ],
      'The condition on node column "score" is on a number column: use BETWEEN or IS_NOT_BETWEEN with a criterion [low, high], low <= high.',
    ],
    [
      'a reversed range',
      [
        columnCondition({
          columnName: 'score',
          predicate: 'BETWEEN',
          criterion: [2, 1],
        }),
      ],
      'The condition on node column "score" is on a number column: use BETWEEN or IS_NOT_BETWEEN with a criterion [low, high], low <= high.',
    ],
    [
      'IS_NOT on a boolean column',
      [
        columnCondition({
          columnName: 'hub',
          predicate: 'IS_NOT',
          criterion: true,
        }),
      ],
      'The condition on node column "hub" is on a boolean column: use IS with true or false.',
    ],
    [
      'a degree condition without a range',
      [{ id: FilterTypeId.Degree, parameters: { predicate: 'BETWEEN' } }],
      'The degree condition must use BETWEEN or IS_NOT_BETWEEN with a criterion [low, high], low <= high.',
    ],
    [
      'a topology condition without a distance',
      [
        {
          id: FilterTypeId.Topology,
          parameters: { predicate: 'GREATER_THAN_OR_EQUAL', threshold: 2 },
          transformers: [],
        },
      ],
      'The topology condition must use GREATER_THAN_OR_EQUAL or LESS_THAN, with a distance and a threshold.',
    ],
  ])('refuses %s', (_, conditions, problem) => {
    expect(check(JSON.stringify(conditions))).toEqual([problem])
  })

  it('accepts a topology condition without neighbour conditions', () => {
    expect(
      check(
        JSON.stringify([
          {
            id: FilterTypeId.Topology,
            parameters: {
              predicate: 'GREATER_THAN_OR_EQUAL',
              distance: 1,
              threshold: 2,
            },
            transformers: [],
          },
        ]),
      ),
    ).toEqual([])
  })

  it(`refuses more than ${MAX_GENERATED_CONDITIONS} conditions`, () => {
    const many = Array.from(
      { length: MAX_GENERATED_CONDITIONS + 1 },
      () => NAME,
    )
    expect(check(JSON.stringify(many))).toEqual([
      `The filter has more than ${MAX_GENERATED_CONDITIONS} conditions.`,
    ])
  })

  it('reports the depth once', () => {
    let condition: unknown = groupOf(SCORE, NAME)
    for (let i = 0; i < 6; i++) condition = groupOf(condition)
    expect(check(JSON.stringify([condition]))).toEqual([
      'Conditions are nested more than 6 levels deep.',
    ])
  })

  describe('in hide mode', () => {
    it('refuses node and edge conditions together', () => {
      const edge = columnCondition({
        columnName: 'interaction',
        predicate: 'IS',
        criterion: 'pp',
        type: 'edges',
      })
      expect(check(JSON.stringify([NAME, edge]), GenerationMode.HIDE)).toEqual([
        'A "hide" filter must have conditions about nodes only or edges only.',
      ])
      expect(check(JSON.stringify([NAME, edge]), GenerationMode.SHOW)).toEqual(
        [],
      )
    })

    it('refuses lists of booleans', () => {
      const flags = columnCondition({
        columnName: 'flags',
        predicate: 'IS',
        criterion: true,
      })
      expect(check(JSON.stringify([flags]), GenerationMode.HIDE)).toEqual([
        'The condition on node column "flags" is on a list of booleans, which a "hide" filter cannot use.',
      ])
      expect(check(JSON.stringify([flags]))).toEqual([])
    })
  })
})

describe('FILTER_ANSWER_JSON_SCHEMA', () => {
  const defs = FILTER_ANSWER_JSON_SCHEMA.$defs

  it('follows the rules of strict structured output', () => {
    const objects: Record<string, unknown>[] = [
      FILTER_ANSWER_JSON_SCHEMA,
      ...Object.values(defs).filter(
        (def): def is (typeof defs)['group'] => 'properties' in def,
      ),
    ]
    objects.forEach((schema) => {
      expect(schema.additionalProperties).toBe(false)
      expect(schema.required).toEqual(
        Object.keys(schema.properties as Record<string, unknown>),
      )
    })
  })

  it('names the condition ids and predicates of the model', () => {
    expect(defs.group.properties.id.enum).toEqual([FilterTypeId.Composite])
    expect(defs.column.properties.id.enum).toEqual([FilterTypeId.Column])
    expect(defs.degree.properties.id.enum).toEqual([FilterTypeId.Degree])
    expect(defs.topology.properties.id.enum).toEqual([FilterTypeId.Topology])
    const predicates = Object.values(FilterPredicate) as string[]
    ;[
      ...defs.column.properties.parameters.properties.predicate.enum,
      ...defs.degree.properties.parameters.properties.predicate.enum,
      ...defs.topology.properties.parameters.properties.predicate.enum,
    ].forEach((predicate) => expect(predicates).toContain(predicate))
    expect(
      defs.column.properties.parameters.properties.predicate.enum,
    ).not.toContain(FilterPredicate.REGEX)
    expect(defs.degree.properties.parameters.properties.edgeType.enum).toEqual(
      Object.values(DegreeEdgeType),
    )
    expect(FILTER_ANSWER_JSON_SCHEMA.properties.mode.enum).toEqual([
      ...Object.values(GenerationMode),
      null,
    ])
  })
})

describe('cutText', () => {
  it('trims, and cuts at characters rather than code units', () => {
    expect(cutText('  hi  ', 10)).toBe('hi')
    expect(cutText(null, 10)).toBe('')
    expect(cutText('🧬🧬🧬🧬', 3)).toBe('🧬🧬…')
  })
})
