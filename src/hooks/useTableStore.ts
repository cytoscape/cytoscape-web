import create from 'zustand'
import produce from 'immer'

import smallTable from '../../data/1000Rows.json'
import mediumTable from '../../data/10000Rows.json'
import largeTable from '../../data/100000Rows.json'

interface Table {
  rows: any[]
  columns: any[]
}

type TableSize = 'small' | 'medium' | 'large'

const tableMap: Record<TableSize, Table> = {
  small: smallTable,
  medium: mediumTable,
  large: largeTable,
}

interface TableState {
  rows: any[]
  columns: any[]
  loadTableState: (size: TableSize) => void
  setCellValue: (newValue: string, row: number, key: string) => void
}

export const useTableStore = create((set, get: () => TableState) => {
  const tableState: TableState = {
    rows: [],
    columns: [],
    loadTableState: (size: TableSize): void => {
      const table = tableMap[size]
      console.log(table)
      set(
        produce((state) => {
          state.rows = table.rows
          state.columns = table.columns
        }),
      )
    },
    setCellValue: (newValue: string, row: number, key: string): void => {
      set(
        produce((state) => {
          state.rows[row][key] = newValue
        }),
      )
    },
  }

  return tableState
})
