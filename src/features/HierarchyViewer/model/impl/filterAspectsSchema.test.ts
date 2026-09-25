// @vitest-environment node
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { FilterWidgetType } from '../../../../models/FilterModel'
import { GraphObjectType } from '../../../../models/NetworkModel'
import { FILTER_ASPECT_TAG } from '../FilterAspects'
import { parseFilterAspects } from './filterAspectsSchema'

const FIXTURES = path.resolve(__dirname, '../../../../../test/fixtures')

// Returns the raw value of the filterWidgets aspect in a CX2 fixture.
const filterWidgetsOf = (relativePath: string): unknown => {
  const cx2 = JSON.parse(
    fs.readFileSync(path.join(FIXTURES, relativePath), 'utf-8'),
  ) as Record<string, unknown>[]
  const aspect = cx2.find((a) => FILTER_ASPECT_TAG in a)
  return aspect?.[FILTER_ASPECT_TAG]
}

const validEntry = (overrides: Record<string, unknown> = {}) => ({
  widgetType: 'checkboxes',
  label: 'Interaction source',
  filterMode: 'edge',
  appliesTo: 'edges',
  attributeName: 'interaction',
  mappingSource: 'EDGE_LINE_COLOR',
  filter: [
    {
      predicate: 'IS',
      criterion: 'MuSIC_top1p',
      description: 'Integrated interaction',
    },
  ],
  ...overrides,
})

describe('parseFilterAspects', () => {
  it('parses the real MuSIC interaction network aspect', () => {
    const raw = filterWidgetsOf(
      'ndex/d3030388-dcb7-11ee-867c-005056aecf54.valid.filters.cx2',
    )

    const aspects = parseFilterAspects(raw)

    expect(aspects).toHaveLength(1)
    expect(aspects[0]).toMatchObject({
      widgetType: FilterWidgetType.CHECKBOX,
      filterMode: GraphObjectType.EDGE,
      appliesTo: GraphObjectType.EDGE,
      attributeName: 'interaction',
      label: 'Interaction source',
      mappingSource: 'EDGE_LINE_COLOR',
    })
    expect(aspects[0].filter).toHaveLength(5)
    expect(aspects[0].filter[0]).toEqual({
      predicate: 'IS',
      criterion: 'MuSIC_top1p',
      description: 'Integrated interaction',
      tooltip: '',
    })
  })

  it('drops every entry of the invalid-filter-config fixture', () => {
    const raw = filterWidgetsOf('hcx/invalid/invalid-filter-config.invalid.cx2')
    expect(raw).toEqual([{ invalid: 'structure' }])

    expect(parseFilterAspects(raw)).toEqual([])
  })

  it.each([
    ['an object', {}],
    ['a string', 'filters'],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
  ])('returns no aspects when the aspect is %s', (_label, raw) => {
    expect(parseFilterAspects(raw)).toEqual([])
  })

  it.each(['attributeName', 'appliesTo', 'filter'])(
    'drops an entry missing %s and keeps the valid ones',
    (field) => {
      const broken: Record<string, unknown> = validEntry()
      delete broken[field]

      const aspects = parseFilterAspects([
        broken,
        validEntry({ label: 'kept' }),
      ])

      expect(aspects).toHaveLength(1)
      expect(aspects[0].label).toBe('kept')
    },
  )

  it.each([
    ['an empty attributeName', { attributeName: '' }],
    ['a non-string attributeName', { attributeName: 7 }],
    ['an unknown appliesTo', { appliesTo: 'network' }],
    ['a non-array filter', { filter: {} }],
    ['a filter item without criterion', { filter: [{ predicate: 'IS' }] }],
    ['an unsupported widgetType', { widgetType: 'slider' }],
    ['a null entry', null],
  ])('drops an entry with %s', (_label, overrides) => {
    const entry = overrides === null ? null : validEntry(overrides)
    expect(parseFilterAspects([entry])).toEqual([])
  })

  it.each([
    ['nodes', GraphObjectType.NODE],
    ['node', GraphObjectType.NODE],
    ['Nodes', GraphObjectType.NODE],
    ['edges', GraphObjectType.EDGE],
    ['edge', GraphObjectType.EDGE],
    ['EDGE', GraphObjectType.EDGE],
  ])('normalizes appliesTo/filterMode "%s"', (value, expected) => {
    const [aspect] = parseFilterAspects([
      validEntry({ appliesTo: value, filterMode: value }),
    ])
    expect(aspect.appliesTo).toBe(expected)
    expect(aspect.filterMode).toBe(expected)
  })

  it('applies a "nodes" filter to nodes', () => {
    const [aspect] = parseFilterAspects([
      validEntry({ appliesTo: 'nodes', filterMode: 'node' }),
    ])
    expect(aspect.appliesTo).toBe(GraphObjectType.NODE)
  })

  it.each(['checkbox', 'checkboxes', 'Checkboxes'])(
    'normalizes widgetType "%s" to CHECKBOX',
    (value) => {
      const [aspect] = parseFilterAspects([validEntry({ widgetType: value })])
      expect(aspect.widgetType).toBe(FilterWidgetType.CHECKBOX)
    },
  )

  it('fills in optional fields', () => {
    const [aspect] = parseFilterAspects([
      {
        appliesTo: 'nodes',
        attributeName: 'type',
        filter: [{ predicate: 'IS', criterion: 'gene' }],
      },
    ])
    expect(aspect).toEqual({
      widgetType: FilterWidgetType.CHECKBOX,
      filterMode: GraphObjectType.NODE,
      appliesTo: GraphObjectType.NODE,
      attributeName: 'type',
      label: 'type',
      mappingSource: '',
      filter: [
        {
          predicate: 'IS',
          criterion: 'gene',
          description: 'gene',
          tooltip: '',
        },
      ],
    })
  })

  describe('prototype pollution', () => {
    it('strips __proto__ and constructor keys from entries and items', () => {
      const raw = JSON.parse(`[{
        "__proto__": { "polluted": true },
        "constructor": { "prototype": { "polluted": true } },
        "appliesTo": "edges",
        "attributeName": "interaction",
        "filter": [{
          "__proto__": { "polluted": true },
          "predicate": "IS",
          "criterion": "a"
        }]
      }]`) as unknown

      const aspects = parseFilterAspects(raw)

      expect(aspects).toHaveLength(1)
      const [aspect] = aspects
      expect(Object.getPrototypeOf(aspect)).toBe(Object.prototype)
      expect(Object.hasOwn(aspect, '__proto__')).toBe(false)
      expect(Object.hasOwn(aspect, 'constructor')).toBe(false)
      expect((aspect as unknown as Record<string, unknown>).polluted).toBe(
        undefined,
      )
      expect(Object.getPrototypeOf(aspect.filter[0])).toBe(Object.prototype)
      expect(Object.hasOwn(aspect.filter[0], '__proto__')).toBe(false)
      expect(({} as Record<string, unknown>).polluted).toBe(undefined)
    })

    it.each(['__proto__', 'constructor', 'prototype'])(
      'rejects the attribute name "%s"',
      (attributeName) => {
        expect(parseFilterAspects([validEntry({ attributeName })])).toEqual([])
      },
    )
  })
})
