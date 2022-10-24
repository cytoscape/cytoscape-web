import create from 'zustand'
import produce from 'immer'

import * as NetworkFn from '../newModels/Network/network-functions'
import { Network } from '../newModels/Network'
import { Table } from '../newModels/Table'
import { Column } from '../newModels/Table/Column'

import { Cx2 } from '../utils/cx/Cx2'

const fetchNetwork = async (): Promise<[Network, Table]> => {
  const MUSIC_URL =
    'https://public.ndexbio.org/v3/networks/7fc70ab6-9fb1-11ea-aaef-0ac135e8bacf'

  const response = await fetch(MUSIC_URL)
  const cx: Cx2 = await response.json()
  const netAndTable: [Network, Table] = NetworkFn.createNetworkFromCx(
    cx,
    'music',
  )

  return netAndTable
}

interface DerivedColumn extends Column {
  title: string
}

interface TableState {
  table: Table
  derivedColumns: DerivedColumn[]
  loadDemoTable: () => Promise<void>
  setCellValue: (newValue: string, row: number, key: string) => void
}

export const useModelTableStore = create((set, get: () => TableState) => {
  const tableState: TableState = {
    table: {
      id: '',
      rows: [],
      columns: [],
    },
    derivedColumns: [],
    loadDemoTable: async (): Promise<void> => {
      const result = await fetchNetwork()
      const table = result[1]
      set(
        produce((state) => {
          state.table = table
          state.derivedColumns = table.columns.map((c) => {
            return {
              ...c,
              title: c.id,
            }
          })
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
