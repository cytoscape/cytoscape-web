// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Table } from '@/models/TableModel'

import { hiddenByFilter } from './subsystemFilter'

const table = {
  id: 't',
  columns: [],
  rows: new Map<string, Record<string, unknown>>([
    ['e1', { interaction: 'MuSIC_top1p' }],
    ['e2', { interaction: 'BioPlex' }],
    ['e3', {}],
  ]),
} as unknown as Table

describe('hiddenByFilter', () => {
  it('hides rows whose value is not checked', () => {
    expect([
      ...hiddenByFilter(table, 'interaction', ['BioPlex', null]),
    ]).toEqual(['e1'])
  })

  it('matches a missing value to the null option', () => {
    expect([...hiddenByFilter(table, 'interaction', ['BioPlex'])]).toEqual([
      'e1',
      'e3',
    ])
  })

  it('hides every row when nothing is checked', () => {
    expect(hiddenByFilter(table, 'interaction', []).size).toBe(3)
  })
})
