import { ValueTypeName } from '../../../models/TableModel'
import { ColumnAssignmentState } from '../model/ColumnAssignmentState'
import { ColumnAssignmentType } from '../model/ColumnAssignmentType'
import { validateColumnValues } from '../model/impl/ParseValues'

describe('validateColumnValues', () => {
  it('returns empty array if all values match column type', () => {
    const column: ColumnAssignmentState = {
      name: 'col1',
      dataType: ValueTypeName.String,
      meaning: ColumnAssignmentType.EdgeAttribute,
      invalidValues: [],
    }
    const rows = [{ col1: 'abc' }, { col1: 'def' }]
    expect(validateColumnValues(column, rows)).toEqual([])
  })

  it('returns index of rows with invalid values', () => {
    const column: ColumnAssignmentState = {
      name: 'col1',
      dataType: ValueTypeName.Integer,
      meaning: ColumnAssignmentType.EdgeAttribute,
      invalidValues: [],
    }
    const rows = [{ col1: '1' }, { col1: 'abc' }, { col1: '2' }]
    expect(validateColumnValues(column, rows)).toEqual([1])
  })

  it('handles empty rows', () => {
    const column: ColumnAssignmentState = {
      name: 'col1',
      dataType: ValueTypeName.String,
      meaning: ColumnAssignmentType.EdgeAttribute,
      invalidValues: [],
    }
    const rows: any[] = []
    expect(validateColumnValues(column, rows)).toEqual([])
  })

  it('A list value with one value is valid', () => {
    const column: ColumnAssignmentState = {
      name: 'col1',
      dataType: ValueTypeName.ListInteger,
      meaning: ColumnAssignmentType.EdgeAttribute,
      delimiter: ',',
      invalidValues: [],
    }
    const rows = [{ col1: '1,2' }, { col1: '1' }, { col1: '3,2' }]
    expect(validateColumnValues(column, rows)).toEqual([])
  })
})
