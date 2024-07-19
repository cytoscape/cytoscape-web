import { ValueTypeName } from '../../../models/TableModel'
import { ColumnAssignmentType } from '../model/ColumnAssignmentType'
import { validColumnAssignmentTypes } from '../model/impl/CreateNetworkFromTable'

describe('validColumnAssignmentTypes', () => {
  it('returns all column assignment types for ValueTypeName.String', () => {
    const result = validColumnAssignmentTypes(ValueTypeName.String)
    expect(result).toEqual(Object.values(ColumnAssignmentType))
  })

  it('returns column assignment types excluding InteractionType for ValueTypeName.Long', () => {
    const result = validColumnAssignmentTypes(ValueTypeName.Long)
    const expected = Object.values(ColumnAssignmentType).filter(
      (cat) => cat !== ColumnAssignmentType.InteractionType,
    )
    expect(result).toEqual(expected)
  })

  it('returns column assignment types excluding InteractionType for ValueTypeName.Integer', () => {
    const result = validColumnAssignmentTypes(ValueTypeName.Integer)
    const expected = Object.values(ColumnAssignmentType).filter(
      (cat) => cat !== ColumnAssignmentType.InteractionType,
    )
    expect(result).toEqual(expected)
  })

  it('returns default column assignment types for other ValueTypeName values', () => {
    const result = validColumnAssignmentTypes(ValueTypeName.ListDouble)
    const expected = [
      ColumnAssignmentType.NotImported,
      ColumnAssignmentType.EdgeAttribute,
      ColumnAssignmentType.SourceNodeAttribute,
      ColumnAssignmentType.TargetNodeAttribute,
    ]
    expect(result).toEqual(expected)
  })
})
