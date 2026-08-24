// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { GraphObjectType } from '../../../models/NetworkModel'
import type { ValueType } from '../../../models/TableModel'
import {
  getAllDiscreteValues,
  getDefaultCheckboxFilterConfig,
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
