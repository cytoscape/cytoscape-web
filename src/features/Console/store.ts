import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type ConsoleEntryStatus = 'success' | 'error' | 'info' | 'warning'

export interface ConsoleEntry {
  id: string
  command: string
  status: ConsoleEntryStatus
  output: string[]
  timestamp: number
}

interface ConsoleStoreState {
  entries: ConsoleEntry[]
  addEntry: (entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => void
  clear: () => void
}

export const useConsoleStore = create(
  immer<ConsoleStoreState>((set, get) => ({
    entries: [],
    addEntry: (entry) => {
      set((state) => {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`
        state.entries.unshift({
          ...entry,
          id,
          timestamp: Date.now(),
        })
      })
    },
    clear: () => {
      set((state) => {
        state.entries = []
      })
    },
  })),
)
