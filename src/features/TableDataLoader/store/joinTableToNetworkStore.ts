import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const JoinTableToNetworkStep = {
  FileUpload: 'fileupload',
  ColumnAppendForm: 'columnappendform',
} as const
export type JoinTableToNetworkStep =
  (typeof JoinTableToNetworkStep)[keyof typeof JoinTableToNetworkStep]

export interface JoinTableToNetworkOptions {
  startImportFrom: number
  delimiter: string
  defaultInteraction: string
  ignoreLinesStartingWith: string
}

export const defaultJoinTableToNetworkOptions: JoinTableToNetworkOptions = {
  startImportFrom: 1,
  delimiter: ',',
  defaultInteraction: 'interacts with',
  ignoreLinesStartingWith: '',
}

interface JoinTableToNetworkState {
  loading: boolean
  step: JoinTableToNetworkStep
  file?: File
  rawText: string
  options: JoinTableToNetworkOptions
}

interface JoinTableToNetworkAction {
  goToStep: (nextStep: JoinTableToNetworkStep) => void
  setFile: (f: File) => void
  setRawText: (s: string) => void
}

type JoinTableToNetworkStore = JoinTableToNetworkState &
  JoinTableToNetworkAction

export const useJoinTableToNetworkStore = create(
  immer<JoinTableToNetworkStore>((set) => ({
    loading: false,
    step: JoinTableToNetworkStep.FileUpload,
    options: defaultJoinTableToNetworkOptions,
    rawText: '',
    setFile: (f: File) => {
      set((state) => {
        state.file = f
      })
    },
    goToStep: (nextStep: JoinTableToNetworkStep) => {
      set((state) => {
        state.step = nextStep
      })
    },
    setRawText: (s: string) => {
      set((state) => {
        state.rawText = s
      })
    },
  })),
)
