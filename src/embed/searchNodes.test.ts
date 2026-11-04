// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Table } from '@/models/TableModel'

import { searchNodes } from './searchNodes'

const table = {
  id: 't',
  columns: [],
  rows: new Map<string, Record<string, unknown>>([
    ['1', { name: 'GAPDH', size: 3 }],
    ['2', { name: 'PKM', aliases: ['pyruvate kinase', 'PK3'] }],
    ['3', { name: 'TP53' }],
  ]),
} as unknown as Table

describe('searchNodes', () => {
  it('matches a substring of a string attribute, ignoring case', () => {
    expect(searchNodes(table, 'gap')).toEqual(['1'])
  })

  it('matches inside string lists', () => {
    expect(searchNodes(table, 'kinase')).toEqual(['2'])
  })

  it('matches nothing for a blank query', () => {
    expect(searchNodes(table, '  ')).toEqual([])
  })

  it('ignores numeric attributes', () => {
    // size: 3 on node 1 does not match; PK3 and TP53 do
    expect(searchNodes(table, '3')).toEqual(['2', '3'])
  })
})
