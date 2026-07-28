import { describe, expect, it } from 'vitest'

import type { NetworkSummary } from '../../../../models/NetworkSummaryModel'
import type { Table } from '../../../../models/TableModel'
import { HcxMetaTag, SubsystemTag } from '../HcxMetaTag'
import { isValidHcxVersion, validateHcx } from './hcxValidators'

const HCX_VERSION = 'hierarchy_v0.1'

const summaryWith = (props: Record<string, string>): NetworkSummary =>
  ({
    properties: Object.entries(props).map(([predicateString, value]) => ({
      predicateString,
      value,
      predicateType: 'string',
    })),
  }) as unknown as NetworkSummary

const tableWith = (
  columnNames: string[],
  rows: Record<string, Record<string, unknown>>,
): Table =>
  ({
    columns: columnNames.map((name) => ({ name, type: 'list_of_string' })),
    rows: new Map(Object.entries(rows)),
  }) as unknown as Table

const validSummary = summaryWith({
  [HcxMetaTag.ndexSchema]: HCX_VERSION,
  [HcxMetaTag.interactionNetworkUUID]: 'uuid-1',
})

const validTable = tableWith([SubsystemTag.members], {
  n1: { [SubsystemTag.members]: ['a', 'b'] },
  n2: { [SubsystemTag.members]: ['c'] },
})

describe('isValidHcxVersion', () => {
  it('accepts strings with the hierarchy_v prefix', () => {
    expect(isValidHcxVersion('hierarchy_v0.1')).toBe(true)
    expect(isValidHcxVersion('hierarchy_v2')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidHcxVersion('v0.1')).toBe(false)
    expect(isValidHcxVersion('')).toBe(false)
    expect(isValidHcxVersion(undefined as unknown as string)).toBe(false)
  })
})

describe('validateHcx', () => {
  it('accepts a well-formed HCX network with no warnings', () => {
    const result = validateHcx(HCX_VERSION, validSummary, validTable)

    expect(result.isValid).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.version).toBe(HCX_VERSION)
  })

  it('rejects an unknown version outright', () => {
    const result = validateHcx('hierarchy_v9.9', validSummary, validTable)

    expect(result.isValid).toBe(false)
    expect(result.warnings).toEqual([
      'Unsupported hcx version: hierarchy_v9.9',
    ])
  })

  it('warns twice when the ndexSchema attribute has the wrong format', () => {
    const badSchema = summaryWith({
      [HcxMetaTag.ndexSchema]: 'bogus',
      [HcxMetaTag.interactionNetworkUUID]: 'uuid-1',
    })

    const result = validateHcx(HCX_VERSION, badSchema, validTable)

    expect(result.isValid).toBe(false)
    expect(
      result.warnings.some((w) => w.includes("prefix 'hierarchy_v'")),
    ).toBe(true)
    expect(
      result.warnings.some((w) => w.includes('Unsupported hcx version')),
    ).toBe(true)
  })

  it('requires a members or memberNames column in the node table', () => {
    const noMemberColumns = tableWith(['name'], {
      n1: { name: 'Node 1' },
    })

    const result = validateHcx(HCX_VERSION, validSummary, noMemberColumns)

    expect(result.isValid).toBe(false)
    expect(result.warnings.some((w) => w.includes('must exist'))).toBe(true)
  })

  it('requires interactionNetworkUUID when a members column exists', () => {
    const noUuid = summaryWith({ [HcxMetaTag.ndexSchema]: HCX_VERSION })

    const result = validateHcx(HCX_VERSION, noUuid, validTable)

    expect(result.isValid).toBe(false)
    expect(
      result.warnings.some((w) =>
        w.includes(HcxMetaTag.interactionNetworkUUID),
      ),
    ).toBe(true)
  })

  it('lists the rows that are missing member values', () => {
    const holes = tableWith([SubsystemTag.members], {
      n1: { [SubsystemTag.members]: ['a'] },
      n2: {},
      n3: {},
    })

    const result = validateHcx(HCX_VERSION, validSummary, holes)

    expect(result.isValid).toBe(false)
    expect(
      result.warnings.some(
        (w) => w.includes('missing a value') && w.includes('n2, n3'),
      ),
    ).toBe(true)
  })

  it('validates memberNames columns the same way', () => {
    const memberNamesTable = tableWith([SubsystemTag.memberNames], {
      n1: { [SubsystemTag.memberNames]: ['Gene A'] },
    })

    expect(
      validateHcx(HCX_VERSION, validSummary, memberNamesTable).isValid,
    ).toBe(true)

    const noUuid = summaryWith({ [HcxMetaTag.ndexSchema]: HCX_VERSION })
    expect(validateHcx(HCX_VERSION, noUuid, memberNamesTable).isValid).toBe(
      false,
    )
  })
})
