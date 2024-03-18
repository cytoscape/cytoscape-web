import { cloneDeep } from 'lodash'
import { DataTableValue } from 'primereact/datatable'
import { Column, Table, ValueTypeName } from '../../../../models/TableModel'
import { ColumnAppendState } from '../ColumnAppendState'
import { ColumnAppendType } from '../ColumnAppendType'
import { DelimiterType } from '../DelimiterType'

export const columnAppendType2Label = {
  [ColumnAppendType.NotImported]: 'Not imported',
  [ColumnAppendType.Key]: 'Key',
  [ColumnAppendType.Attribute]: 'Attribute',
}

export const validValueTypesCapt = (
  capt: ColumnAppendType,
): ValueTypeName[] => {
  switch (capt) {
    case ColumnAppendType.Key:
      return [ValueTypeName.String, ValueTypeName.Integer, ValueTypeName.Long]
    case ColumnAppendType.Attribute:
      return Object.values(ValueTypeName)
    default:
      return Object.values(ValueTypeName)
  }
}

export const validColumnAppendTypes = (
  vtn: ValueTypeName,
): ColumnAppendType[] => {
  switch (vtn) {
    case ValueTypeName.String:
      return [
        ColumnAppendType.NotImported,
        ColumnAppendType.Key,
        ColumnAppendType.Attribute,
      ]
    case ValueTypeName.Long:
    case ValueTypeName.Integer:
      return [
        ColumnAppendType.NotImported,
        ColumnAppendType.Key,
        ColumnAppendType.Attribute,
      ]
    default:
      return [ColumnAppendType.NotImported, ColumnAppendType.Attribute]
  }
}

export const updateColumnAppend = (
  cat: ColumnAppendType,
  index: number,
  columns: ColumnAppendState[],
): ColumnAppendState[] => {
  const nextColumns = [...columns]
  switch (cat) {
    case ColumnAppendType.Key: {
      // There can only be one column assigned to the key
      // Reset the previous column with the same key back to default key
      const prevColumnWithMeaning = nextColumns.findIndex(
        (c) => c.meaning === cat,
      )
      if (prevColumnWithMeaning !== -1) {
        nextColumns[prevColumnWithMeaning] = {
          ...nextColumns[prevColumnWithMeaning],
          meaning: ColumnAppendType.Attribute,
        }
      }

      const nextColumn = { ...nextColumns[index], meaning: cat }
      nextColumns[index] = nextColumn

      return nextColumns
    }
    default: {
      const nextColumn = { ...nextColumns[index], meaning: cat }
      nextColumns[index] = nextColumn

      return nextColumns
    }
  }
}

export const updateColumnAppendType = (
  vtn: ValueTypeName,
  index: number,
  columns: ColumnAppendState[],
  delimiter?: DelimiterType,
): ColumnAppendState[] => {
  if (!validValueTypesCapt(columns[index].meaning).includes(vtn)) {
    throw new Error(
      `Invalid value type ${vtn} for column meaning ${columns[index].meaning}`,
    )
  }
  const nextColumns = [...columns]
  const nextColumn = { ...nextColumns[index], dataType: vtn }

  if (delimiter !== undefined) {
    nextColumn.delimiter = delimiter
  }
  nextColumns[index] = nextColumn

  return nextColumns
}

export const selectAllColumns = (
  columns: ColumnAppendState[],
): ColumnAppendState[] => {
  return columns.map((c) => ({
    ...c,
    dataType: ValueTypeName.String,
    meaning: ColumnAppendType.Attribute,
    invalidValues: [],
  }))
}

export const unselectAllColumns = (
  columns: ColumnAppendState[],
): ColumnAppendState[] => {
  return columns.map((c) => ({
    ...c,
    dataType: ValueTypeName.String,
    meaning: ColumnAppendType.NotImported,
    invalidValues: [],
  }))
}

export function validNetworkKeyColumns(columns: Column[]): Column[] {
  return columns.filter((c) =>
    validColumnAppendTypes(c.type).includes(ColumnAppendType.Key),
  )
}

export const findValidRowsToJoin = (
  table: Table,
  rows: DataTableValue[],
  column?: ColumnAppendState,
  networkKeyColumn?: Column,
): number[] => {
  if (column === undefined || networkKeyColumn === undefined) {
    return []
  }

  const rowsToJoin: number[] = []
  const keyValues: Record<string, number[]> = {}
  rows.forEach((r, i) => {
    if (keyValues[r[column.name]] !== undefined) {
      keyValues[r[column.name]].push(i)
    } else {
      keyValues[r[column.name]] = [i]
    }
  })

  table.rows.forEach((row, rowId) => {
    // assume that the column is a key column which should mean that the data type is
    // string, integer or long

    // TODO figure out how I know what the networkKeyColumn is?
    const value = `${row[networkKeyColumn.name]}`
    if (keyValues[value] !== undefined) {
      rowsToJoin.push(...keyValues[value])
    }
  })

  return rowsToJoin
}

// TODO handle the case when the columns to append are not unique
// (i.e. shared between the network and the tabular data)
export const joinRowsToTable = (
  table: Table,
  rows: DataTableValue[],
  columns: ColumnAppendState[],
  networkKeyColumn: Column,
): Table => {
  const keyColumn = columns.find((c) => c.meaning === ColumnAppendType.Key)
  const columnsToAppend = columns.filter(
    (c) => c.meaning === ColumnAppendType.Attribute,
  )

  // TODO maybe throw an error instead?
  if (keyColumn === undefined) {
    return table
  }

  const newTable: Table = {
    id: table.id,
    columns: cloneDeep(table.columns),
    rows: new Map(table.rows),
  }

  newTable.columns.push(
    ...columnsToAppend.map((c) => ({ name: c.name, type: c.dataType })),
  )

  const keyValues: Record<string, { rowId: number; value: DataTableValue }[]> =
    {}
  rows.forEach((r, i) => {
    if (keyValues[r[keyColumn.name]] !== undefined) {
      keyValues[r[keyColumn.name]].push({ rowId: i, value: r })
    } else {
      keyValues[r[keyColumn.name]] = [{ rowId: i, value: r }]
    }
  })

  newTable.rows.forEach((row, rowId) => {
    const newRow: Record<string, any> = { ...row }
    // Assume that the column is a key column which should mean that the data type is
    // string, integer or long

    // How do I know which columnn is the key column in the network?
    const rowKey = `${row[networkKeyColumn.name]}`
    if (keyValues[rowKey] !== undefined) {
      keyValues[rowKey].forEach((v) => {
        columnsToAppend.forEach((c) => {
          newRow[c.name] = v.value[c.name]
        })
      })
    }
    newTable.rows.set(rowId, newRow)
  })

  return newTable
}
