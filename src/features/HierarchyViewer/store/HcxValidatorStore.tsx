import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { HcxValidationResult } from '../model/HcxValidator'
import { IdType } from '../../../models/IdType'
interface HcxValidationState {
  validationResults: Record<IdType, HcxValidationResult>
}

interface HcxValidationAction {
  setValidationResult: (
    networkId: IdType,
    validationResult: HcxValidationResult,
  ) => void
  deleteValidationResult: (networkId: IdType) => void
  deleteAllValidationResults: () => void
}

type HcxValidationStore = HcxValidationState & HcxValidationAction

/**
 * Store that holds Hcx validation results
 */
export const useHcxValidatorStore = create(
  immer<HcxValidationStore>((set) => ({
    validationResults: {},
    setValidationResult: (networkId, validationResult) => {
      set((state) => {
        state.validationResults[networkId] = validationResult
      })
    },
    deleteValidationResult: (networkId) => {
      set((state) => {
        delete state.validationResults[networkId]
      })
    },
    deleteAllValidationResults: () => {
      set((state) => {
        state.validationResults = {}
      })
    },
  })),
)
