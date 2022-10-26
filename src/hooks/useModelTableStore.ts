import create from 'zustand'
import produce from 'immer'

import NetworkFn, { Network } from '../models/NetworkModel'
import { Table } from '../models/TableModel'

import { Cx2 } from '../utils/cx/Cx2'

const fetchNetwork = async (): Promise<Network> => {
  const MUSIC_URL =
    'https://public.ndexbio.org/v3/networks/7fc70ab6-9fb1-11ea-aaef-0ac135e8bacf'

  const response = await fetch(MUSIC_URL)
  const cx: Cx2 = await response.json()
  const network: Network = NetworkFn.createNetworkFromCx(cx, 'music')

  return network
}

interface TableState {
  table: Table
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
    loadDemoTable: async (): Promise<void> => {
      const result = await fetchNetwork()
      const table = result[1]
      console.log(table)
      set(
        produce((state) => {
          state.table = table
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
