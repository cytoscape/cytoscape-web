import { IdType } from '../newModels/IdType'
import TableFn, {
  AttributeName,
  Column,
  Table,
  ValueType,
  ValueTypeName,
} from '../newModels/TableModel'

test('create an empty Table', () => {
  const tableId1: IdType = 'table1'
  const table = TableFn.createTable(tableId1)

  expect(table).toEqual({
    id: tableId1,
    columns: new Map<AttributeName, ValueTypeName>(),
    rows: new Map<IdType, Record<AttributeName, ValueType>>(),
  })
})
