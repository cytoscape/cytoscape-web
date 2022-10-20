import create from 'zustand'
import produce from 'immer'

import tableDataJson from '../../data/exampleTableState.json'

const tableData: { rows: any[]; columns: any[] } = tableDataJson
interface TableState {
  rows: any[]
  columns: any[]
  loadTableState: () => void
  setCellValue: (newValue: string, row: number, key: string) => void
}

export const useTableStore = create((set, get: () => TableState) => {
  const tableState: TableState = {
    rows: [],
    columns: [],
    loadTableState: (): void => {
      set(
        produce((state) => {
          state.rows = tableData.rows
          state.columns = tableData.columns
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
