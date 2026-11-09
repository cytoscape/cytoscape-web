// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../../../../models/TableModel'
import { ColumnTypeConflictError } from '../../../../models/TableModel/impl/columnNames'
import { ColumnAssignmentState } from '../ColumnAssignmentState'
import { ColumnAssignmentType } from '../ColumnAssignmentType'
import { createNetworkFromTableData } from './CreateNetworkFromTable'

const column = (
  name: string,
  meaning: ColumnAssignmentType,
  dataType: ValueTypeName = ValueTypeName.String,
): ColumnAssignmentState => ({ name, meaning, dataType, invalidValues: [] })

const { SourceNode, TargetNode, EdgeAttribute, SourceNodeAttribute } =
  ColumnAssignmentType

describe('createNetworkFromTableData duplicate columns (#951)', () => {
  it('merges edge columns: first spelling, last value in file order', () => {
    const { cyNetwork } = createNetworkFromTableData(
      [{ s: 'a', t: 'b', tag: '1', Tag: '2' }],
      [
        column('s', SourceNode),
        column('t', TargetNode),
        column('tag', EdgeAttribute),
        column('Tag', EdgeAttribute),
      ],
    )

    expect(cyNetwork.edgeTable.columns).toEqual([
      { name: 'tag', type: ValueTypeName.String },
    ])
    expect(cyNetwork.edgeTable.rows.get('e0')).toEqual({ tag: '2' })
  })

  it('keeps the value of a row with only one of the spellings', () => {
    const { cyNetwork } = createNetworkFromTableData(
      [
        { s: 'a', t: 'b', tag: '1', Tag: '' },
        { s: 'c', t: 'd', tag: '', Tag: '2' },
      ],
      [
        column('s', SourceNode),
        column('t', TargetNode),
        column('tag', EdgeAttribute),
        column('Tag', EdgeAttribute),
      ],
    )

    expect(cyNetwork.edgeTable.rows.get('e0')).toEqual({ tag: '1' })
    expect(cyNetwork.edgeTable.rows.get('e1')).toEqual({ tag: '2' })
  })

  it('merges node columns: a later spelling replaces an earlier one', () => {
    const { cyNetwork } = createNetworkFromTableData(
      [{ s: 'a', group: '1', GROUP: '2' }],
      [
        column('s', SourceNode),
        column('group', SourceNodeAttribute),
        column('GROUP', SourceNodeAttribute),
      ],
    )

    const names = cyNetwork.nodeTable.columns.map((c) => c.name)
    expect(names).toEqual(['name', 'group'])
    expect(cyNetwork.nodeTable.rows.get('0')).toEqual({
      name: 'a',
      group: '2',
    })
  })

  it('merges an attribute spelled like the built-in name column', () => {
    const { cyNetwork } = createNetworkFromTableData(
      [{ gene: 'a', Name: 'label' }],
      [column('gene', SourceNode), column('Name', SourceNodeAttribute)],
    )

    expect(cyNetwork.nodeTable.columns).toEqual([
      { name: 'name', type: ValueTypeName.String },
    ])
    expect(cyNetwork.nodeTable.rows.get('0')).toEqual({ name: 'label' })
  })

  it('lets the source column win when it comes later in the file', () => {
    const { cyNetwork } = createNetworkFromTableData(
      [{ Name: 'label', name: 'a' }],
      [column('Name', SourceNodeAttribute), column('name', SourceNode)],
    )

    expect(cyNetwork.nodeTable.rows.get('0')).toEqual({ name: 'a' })
  })

  it('lists a merged column once in the table display configuration', () => {
    const { cyNetwork } = createNetworkFromTableData(
      [{ s: 'a', t: 'b', tag: '1', Tag: '2' }],
      [
        column('s', SourceNode),
        column('t', TargetNode),
        column('tag', EdgeAttribute),
        column('Tag', EdgeAttribute),
      ],
    )

    const config =
      cyNetwork.visualStyleOptions?.visualEditorProperties
        .tableDisplayConfiguration.edgeTable.columnConfiguration
    expect(config?.map((c) => c.attributeName)).toEqual(['tag'])
  })

  it('fails when a value would be written to the other type', () => {
    expect(() =>
      createNetworkFromTableData(
        [{ s: 'a', t: 'b', score: 'x', Score: '5' }],
        [
          column('s', SourceNode),
          column('t', TargetNode),
          column('score', EdgeAttribute),
          column('Score', EdgeAttribute, ValueTypeName.Integer),
        ],
      ),
    ).toThrow(ColumnTypeConflictError)
  })

  it('does not fail when the differently typed column has no values', () => {
    const { cyNetwork } = createNetworkFromTableData(
      [{ s: 'a', t: 'b', score: 'x', Score: '' }],
      [
        column('s', SourceNode),
        column('t', TargetNode),
        column('score', EdgeAttribute),
        column('Score', EdgeAttribute, ValueTypeName.Integer),
      ],
    )

    expect(cyNetwork.edgeTable.rows.get('e0')).toEqual({ score: 'x' })
  })

  it('leaves tables with no duplicates as they were', () => {
    const { cyNetwork } = createNetworkFromTableData(
      [{ s: 'a', t: 'b', weight: '1.5' }],
      [
        column('s', SourceNode),
        column('t', TargetNode),
        column('weight', EdgeAttribute, ValueTypeName.Double),
      ],
    )

    expect(cyNetwork.edgeTable.columns).toEqual([
      { name: 'weight', type: ValueTypeName.Double },
    ])
    expect(cyNetwork.edgeTable.rows.get('e0')).toEqual({ weight: 1.5 })
    expect(cyNetwork.nodeTable.rows.get('0')).toEqual({ name: 'a' })
  })

  it('handles empty input', () => {
    const { cyNetwork } = createNetworkFromTableData([], [])

    expect(cyNetwork.nodeTable.rows.size).toBe(0)
    expect(cyNetwork.edgeTable.rows.size).toBe(0)
  })
})
