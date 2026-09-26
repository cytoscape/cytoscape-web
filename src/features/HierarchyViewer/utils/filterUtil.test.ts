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

  it('drops saved values that are no longer in the table', () => {
    const saved: FilterConfig = {
      ...fresh,
      range: { values: ['binds', 'gone', 7] },
    }

    expect(restoreFilterState(fresh, saved).range).toEqual({
      values: ['binds'],
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
