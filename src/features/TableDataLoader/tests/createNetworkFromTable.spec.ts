import { ValueTypeName } from '../../../models/TableModel'
import { ColumnAssignmentState } from '../model/ColumnAssignmentState'
import { ColumnAssignmentType } from '../model/ColumnAssignmentType'
import { createNetworkFromTableData } from '../model/impl/CreateNetworkFromTable'

describe('createNetworkFromTableData', () => {
  it('creates network with correct nodes and edges', () => {
    const rows = [
      { col1: 'A', col2: 'B', col3: 'Interaction 1', col4: '2' },
      { col1: 'B', col2: 'C', col3: 'Interaction 2', col4: '1' },
    ]
    const columns: ColumnAssignmentState[] = [
      {
        name: 'col1',
        dataType: ValueTypeName.String,
        meaning: ColumnAssignmentType.SourceNode,
        invalidValues: [],
      },
      {
        name: 'col2',
        dataType: ValueTypeName.String,
        meaning: ColumnAssignmentType.TargetNode,
        invalidValues: [],
      },
      {
        name: 'col3',
        dataType: ValueTypeName.String,
        meaning: ColumnAssignmentType.InteractionType,
        invalidValues: [],
      },
      {
        name: 'col4',
        dataType: ValueTypeName.Integer,
        meaning: ColumnAssignmentType.EdgeAttribute,
        invalidValues: [],
      },
    ]

    const result = createNetworkFromTableData(rows, columns, 'test')

    expect(result.summary).toEqual({ type: 'localfile', name: 'localfile' })
    expect(result.nodeTable.columns).toEqual([
      { name: 'name', type: ValueTypeName.String },
    ])
    expect(result.nodeTable.rows).toEqual(
      new Map([
        ['0', { name: 'A' }],
        ['1', { name: 'B' }],
        ['2', { name: 'C' }],
      ]),
    )
    expect(result.edgeTable.columns).toEqual([
      { name: 'col4', type: ValueTypeName.Integer },
      { name: 'col3', type: ValueTypeName.String },
    ])
    expect(result.edgeTable.rows).toEqual(
      new Map([
        ['e0', { col3: 'Interaction 1', col4: 2 }],
        ['e1', { col3: 'Interaction 2', col4: 1 }],
      ]),
    )
    expect(result.network).toEqual({
      id: 'test',
      edges: [
        { id: 'e0', s: '0', t: '1' },
        { id: 'e1', s: '1', t: '2' },
      ],
      nodes: [{ id: '0' }, { id: '1' }, { id: '2' }],
    })
  })

  it('handles empty rows', () => {
    const rows: any[] = []
    const columns: ColumnAssignmentState[] = []

    const result = createNetworkFromTableData(rows, columns, 'test')

    expect(result.summary).toEqual({ type: 'localfile', name: 'localfile' })
    expect(result.nodeTable.columns).toEqual([
      { name: 'name', type: ValueTypeName.String },
    ])
    expect(result.nodeTable.rows).toEqual(new Map())
    expect(result.edgeTable.columns).toEqual([])
    expect(result.edgeTable.rows).toEqual(new Map())
    expect(result.network).toEqual({ id: 'test', edges: [], nodes: [] })
  })

  // Add more test cases as needed
})
