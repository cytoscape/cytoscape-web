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
  show: boolean
  loading: boolean
  step: JoinTableToNetworkStep
  file?: File
  rawText: string
  options: JoinTableToNetworkOptions
}

interface JoinTableToNetworkAction {
  setShow: (show: boolean) => void
  goToStep: (nextStep: JoinTableToNetworkStep) => void
  setFile: (f: File) => void
  setRawText: (s: string) => void
  reset: () => void
}

type JoinTableToNetworkStore = JoinTableToNetworkState &
  JoinTableToNetworkAction

export const useJoinTableToNetworkStore = create(
  immer<JoinTableToNetworkStore>((set) => ({
    show: false,
    loading: false,
    step: JoinTableToNetworkStep.FileUpload,
    options: defaultJoinTableToNetworkOptions,
    rawText: '',
    setShow: (show: boolean) => {
      set((state) => {
        state.show = show
      })
    },
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
    reset: () => {
      set(() => ({
        loading: false,
        step: JoinTableToNetworkStep.FileUpload,
        rawText: '',
      }))
    },
  })),
)
