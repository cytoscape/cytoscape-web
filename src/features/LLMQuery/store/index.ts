import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { LLMModel, models } from '../model/LLMModel'
import config from '../../../assets/config.json'
import { LLMTemplate, templates } from '../model/LLMTemplate'

interface LLMQueryState {
  loading: boolean
  geneQuery: string
  LLMResult: string
  LLMApiKey: string
  LLMModel: LLMModel
  LLMTemplate: LLMTemplate
}

interface LLMQueryAction {
  setLoading: (loading: boolean) => void
  setGeneQuery: (geneQuery: string) => void
  setLLMResult: (LLMResult: string) => void
  setLLMApiKey: (LLMApiKey: string) => void
  setLLMModel: (LLMModel: LLMModel) => void
  setLLMTemplate: (LLMTemplate: LLMTemplate) => void
}

type LLMQueryStore = LLMQueryState & LLMQueryAction

/**
 * Store that holds LLM Query related state/actions
 */
export const useLLMQueryStore = create(
  immer<LLMQueryStore>((set) => ({
    loading: false,
    geneQuery: '',
    LLMResult: '',
    LLMApiKey: config.openAIAPIKey,
    LLMModel: models[0],
    LLMTemplate: templates[0],
    setLoading: (loading: boolean) => {
      set((state) => {
        state.loading = loading
      })
    },
    setGeneQuery: (geneQuery: string) => {
      set((state) => {
        state.geneQuery = geneQuery
      })
    },
    setLLMResult: (LLMResult: string) => {
      set((state) => {
        state.LLMResult = LLMResult
      })
    },
    setLLMApiKey: (LLMApiKey: string) => {
      set((state) => {
        state.LLMApiKey = LLMApiKey
      })
    },
    setLLMModel: (LLMModel) => {
      set((state) => {
        state.LLMModel = LLMModel
      })
    },
    setLLMTemplate: (LLMTemplate) => {
      set((state) => {
        state.LLMTemplate = LLMTemplate
      })
    },
  })),
)
