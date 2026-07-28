import { describe, expect, it } from 'vitest'

import type { Table } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'
import { getMembers } from './DataBuilderUtil'

const tableWith = (rows: Record<string, Record<string, unknown>>): Table =>
  ({ rows: new Map(Object.entries(rows)) }) as unknown as Table

describe('getMembers', () => {
  it('returns the members column when present', () => {
    const table = tableWith({
      n1: {
        [SubsystemTag.members]: ['a', 'b'],
        [SubsystemTag.memberNames]: ['Gene A', 'Gene B'],
      },
    })

    expect(getMembers('n1', table)).toEqual(['a', 'b'])
  })

  it('falls back to memberNames when members is absent', () => {
    const table = tableWith({
      n1: { [SubsystemTag.memberNames]: ['Gene A'] },
    })

    expect(getMembers('n1', table)).toEqual(['Gene A'])
  })

  it('throws for a missing row', () => {
    expect(() => getMembers('ghost', tableWith({}))).toThrow(
      'Row ghost not found',
    )
  })

  it('throws when the row has neither members nor memberNames', () => {
    const table = tableWith({ n1: { name: 'Node 1' } })

    expect(() => getMembers('n1', table)).toThrow('Member list not found')
  })
})
