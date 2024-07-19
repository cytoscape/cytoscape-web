import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const CreateNetworkFromTableStep = {
  FileUpload: 'fileupload',
  ColumnAssignmentForm: 'columnassignmentform',
} as const
export type CreateNetworkFromTableStep =
  (typeof CreateNetworkFromTableStep)[keyof typeof CreateNetworkFromTableStep]

export interface CreateNetworkFromTableOptions {
  startImportFrom: number
  delimiter: string
  defaultInteraction: string
  ignoreLinesStartingWith: string
}

export const defaultTableDataLoaderOpts: CreateNetworkFromTableOptions = {
  startImportFrom: 1,
  delimiter: ',',
  defaultInteraction: 'interacts with',
  ignoreLinesStartingWith: '',
}

interface CreateNetworkFromTableState {
  show: boolean
  loading: boolean
  step: CreateNetworkFromTableStep
  file?: File
  rawText: string
  options: CreateNetworkFromTableOptions
  name: string
}

interface CreateNetworkFromTableAction {
  setShow: (show: boolean) => void
  goToStep: (nextStep: CreateNetworkFromTableStep) => void
  setFile: (f: File) => void
  setRawText: (s: string) => void
  setName: (s: string) => void
  reset: () => void
}

type CreateNetworkFromTableStore = CreateNetworkFromTableState &
  CreateNetworkFromTableAction

export const useCreateNetworkFromTableStore = create(
  immer<CreateNetworkFromTableStore>((set) => ({
    show: false,
    loading: false,
    step: CreateNetworkFromTableStep.FileUpload,
    options: defaultTableDataLoaderOpts,
    rawText: '',
    name: '',
    setName: (s: string) => {
      set((state) => {
        state.name = s
      })
    },
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
    goToStep: (nextStep: CreateNetworkFromTableStep) => {
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
        step: CreateNetworkFromTableStep.FileUpload,
        rawText: '',
      }))
    },
  })),
)
