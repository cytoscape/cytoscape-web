// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { FilterConfig } from '../../../models/FilterModel'
import { GraphObjectType } from '../../../models/NetworkModel'
import type { ValueType } from '../../../models/TableModel'
import {
  getAllDiscreteValues,
  getDefaultCheckboxFilterConfig,
  restoreFilterState,
} from './filterUtil'

describe('getAllDiscreteValues', () => {
  it('returns the sorted, de-duplicated values of the attribute', () => {
    const rows = new Map<string, Record<string, ValueType>>([
      ['e1', { type: 'binds' }],
      ['e2', { type: 'activates' }],
      ['e3', { type: 'binds' }],
    ])

    expect(getAllDiscreteValues(rows, 'type')).toEqual(['activates', 'binds'])
  })

  it('returns an empty array for empty rows', () => {
    expect(getAllDiscreteValues(new Map(), 'type')).toEqual([])
  })

  it('adds one null option, last, for null values and rows without the attribute', () => {
    const rows = new Map<string, Record<string, ValueType>>([
      ['e1', { type: 'binds' }],
      ['e2', { type: null as unknown as ValueType }],
      ['e3', {}],
      ['e4', { type: 'activates' }],
    ])

    expect(getAllDiscreteValues(rows, 'type')).toEqual([
      'activates',
      'binds',
      null,
    ])
  })

  it('counts an empty or blank string as a missing value', () => {
    // The table browser writes '' when a string cell is cleared
    const rows = new Map<string, Record<string, ValueType>>([
      ['e1', { type: 'binds' }],
      ['e2', { type: '' }],
      ['e3', { type: '   ' }],
    ])

    expect(getAllDiscreteValues(rows, 'type')).toEqual(['binds', null])
  })

  it('returns only the null option when no row has a value', () => {
    const rows = new Map<string, Record<string, ValueType>>([
      ['e1', {}],
      ['e2', { type: null as unknown as ValueType }],
    ])

    expect(getAllDiscreteValues(rows, 'type')).toEqual([null])
  })

  it('adds no null option when every row has a value', () => {
    const rows = new Map<string, Record<string, ValueType>>([
      ['e1', { type: 'binds' }],
    ])

    expect(getAllDiscreteValues(rows, 'type')).toEqual(['binds'])
  })

  it('sorts numbers numerically, not as strings', () => {
    const rows = new Map<string, Record<string, ValueType>>([
      ['n1', { size: 10 }],
      ['n2', { size: 9 }],
      ['n3', { size: -1.5 }],
      ['n4', { size: 100 }],
      ['n5', { size: 9 }],
    ])

    expect(getAllDiscreteValues(rows, 'size')).toEqual([-1.5, 9, 10, 100])
  })

  it('keeps boolean values as booleans, false first', () => {
    const rows = new Map<string, Record<string, ValueType>>([
      ['n1', { querynode: true }],
      ['n2', { querynode: false }],
      ['n3', { querynode: true }],
    ])

    expect(getAllDiscreteValues(rows, 'querynode')).toEqual([false, true])
  })

  it('keeps sorting strings by code unit', () => {
    const rows = new Map<string, Record<string, ValueType>>([
      ['e1', { type: 'b' }],
      ['e2', { type: 'B' }],
      ['e3', { type: 'a' }],
      ['e4', { type: '10' }],
      ['e5', { type: '9' }],
    ])

    expect(getAllDiscreteValues(rows, 'type')).toEqual([
      '10',
      '9',
      'B',
      'a',
      'b',
    ])
  })
})

describe('getDefaultCheckboxFilterConfig', () => {
  it('builds a checkbox filter config around the given values', () => {
    const config = getDefaultCheckboxFilterConfig(
      'my-filter',
      'type',
      GraphObjectType.EDGE,
      ['activates', 'binds'],
    )

    expect(config).toMatchObject({
      name: 'my-filter',
      attributeName: 'type',
      target: GraphObjectType.EDGE,
      widgetType: 'checkbox',
      range: { values: ['activates', 'binds'] },
    })
    expect(config.visualMapping).toBeUndefined()
  })
})

// #774: a config saved in an earlier session is restored onto the one built
// from the subnetwork's filterWidgets aspect when the subsystem loads again.
describe('restoreFilterState', () => {
  const fresh: FilterConfig = getDefaultCheckboxFilterConfig(
    'net1_7',
    'interaction',
    GraphObjectType.EDGE,
    ['activates', 'binds', 'inhibits'],
  )

  it('keeps the saved checked values and switch', () => {
    const saved: FilterConfig = {
      ...fresh,
      range: { values: ['binds'] },
      enabled: false,
    }

    const restored = restoreFilterState(fresh, saved)

    expect(restored).toEqual({
      ...fresh,
      range: { values: ['binds'] },
      enabled: false,
    })
  })

  it('keeps a saved null option while the table still has missing values', () => {
    const withMissing: FilterConfig = {
      ...fresh,
      range: { values: ['activates', 'binds', null] },
    }
    const saved: FilterConfig = { ...fresh, range: { values: [null] } }

    expect(restoreFilterState(withMissing, saved).range).toEqual({
      values: [null],
    })
    // No missing values any more: the null option is gone
    expect(restoreFilterState(fresh, saved).range).toEqual({ values: [] })
  })

  it('drops saved values that are no longer in the table', () => {
    const saved: FilterConfig = {
      ...fresh,
      range: { values: ['binds', 'gone', 7] },
    }

    expect(restoreFilterState(fresh, saved).range).toEqual({
      values: ['binds'],
    })
  })

  it('matches list values by content and keeps the fresh objects', () => {
    // CheckboxFilter matches row values by identity, so the restored range
    // must hold the fresh config's arrays, not the copies read from the db
    const binds = ['binds', 'weak']
    const inhibits = ['inhibits']
    const listFresh: FilterConfig = {
      ...fresh,
      range: { values: [binds, inhibits] },
    }
    const saved: FilterConfig = {
      ...fresh,
      range: { values: [['binds', 'weak'], ['gone']] },
    }

    const restored = restoreFilterState(listFresh, saved)

    const values = (restored.range as { values: unknown[] }).values
    expect(values).toHaveLength(1)
    expect(values[0]).toBe(binds)
  })

  it('does not match values of different types', () => {
    const numberFresh: FilterConfig = { ...fresh, range: { values: [7, 'x'] } }
    const saved: FilterConfig = {
      ...fresh,
      range: { values: ['7', ['x']] },
    }

    expect(restoreFilterState(numberFresh, saved).range).toEqual({
      values: [],
    })
  })

  it('keeps an empty saved selection', () => {
    const saved: FilterConfig = { ...fresh, range: { values: [] } }

    expect(restoreFilterState(fresh, saved).range).toEqual({ values: [] })
  })

  it('takes everything else from the fresh config', () => {
    const saved: FilterConfig = {
      ...fresh,
      label: 'Old label',
      description: 'Old description',
      range: { values: ['binds'] },
    }

    const restored = restoreFilterState(fresh, saved)

    expect(restored.label).toBe(fresh.label)
    expect(restored.description).toBe(fresh.description)
  })

  it('ignores the saved state when the attribute changed', () => {
    const saved: FilterConfig = {
      ...fresh,
      attributeName: 'other',
      range: { values: ['binds'] },
      enabled: false,
    }

    expect(restoreFilterState(fresh, saved)).toBe(fresh)
  })

  it('ignores the saved state when the target changed', () => {
    const saved: FilterConfig = {
      ...fresh,
      target: GraphObjectType.NODE,
      range: { values: ['binds'] },
    }

    expect(restoreFilterState(fresh, saved)).toBe(fresh)
  })

  it('ignores a saved numeric range', () => {
    const saved: FilterConfig = {
      ...fresh,
      range: { min: 0, max: 1 },
      enabled: false,
    }

    expect(restoreFilterState(fresh, saved)).toEqual({
      ...fresh,
      enabled: false,
    })
  })

  it('does not restore a non-boolean enabled value', () => {
    const saved = { ...fresh, enabled: 'false' } as unknown as FilterConfig

    expect(restoreFilterState(fresh, saved).enabled).toBeUndefined()
  })
})
