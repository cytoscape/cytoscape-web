import { ValueTypeName } from '../../../models/TableModel'
import { ColumnAssignmentType } from '../model/ColumnAssignmentType'
import { validValueTypes } from '../model/impl/CreateNetworkFromTable'

describe('validValueTypes', () => {
  it('returns valid value types for SourceNode and TargetNode', () => {
    const result = validValueTypes(ColumnAssignmentType.SourceNode)
    expect(result).toEqual([
      ValueTypeName.String,
      ValueTypeName.Integer,
      ValueTypeName.Long,
    ])

    const result2 = validValueTypes(ColumnAssignmentType.TargetNode)
    expect(result2).toEqual([
      ValueTypeName.String,
      ValueTypeName.Integer,
      ValueTypeName.Long,
    ])
  })

  it('returns valid value types for InteractionType', () => {
    const result = validValueTypes(ColumnAssignmentType.InteractionType)
    expect(result).toEqual([ValueTypeName.String])
  })

  it('returns all value types for other column assignment types', () => {
    const result = validValueTypes(ColumnAssignmentType.EdgeAttribute)
    expect(result).toEqual(Object.values(ValueTypeName))

    const result2 = validValueTypes(ColumnAssignmentType.TargetNodeAttribute)
    expect(result2).toEqual(Object.values(ValueTypeName))

    const result3 = validValueTypes(ColumnAssignmentType.SourceNodeAttribute)
    expect(result3).toEqual(Object.values(ValueTypeName))
  })
})
