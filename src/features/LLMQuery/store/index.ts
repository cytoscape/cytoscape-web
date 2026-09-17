import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import config from '../../../assets/config.json'
import { LLMModel, models } from '../model/LLMModel'
import { LLMProviderId, providers } from '../model/LLMProvider'
import { LLMTemplate, templates } from '../model/LLMTemplate'

interface LLMQueryState {
  loading: boolean
  geneQuery: string
  LLMResult: string
  LLMApiKey: string
  LLMProvider: LLMProviderId
  // OpenAI-compatible endpoint; '' means the OpenAI default
  LLMBaseUrl: string
  LLMModel: LLMModel
  LLMTemplate: LLMTemplate
}

interface LLMQueryAction {
  setLoading: (loading: boolean) => void
  setGeneQuery: (geneQuery: string) => void
  setLLMResult: (LLMResult: string) => void
  setLLMApiKey: (LLMApiKey: string) => void
  setLLMProvider: (LLMProvider: LLMProviderId) => void
  setLLMBaseUrl: (LLMBaseUrl: string) => void
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
    LLMProvider: providers[0].id,
    LLMBaseUrl: '',
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
    setLLMProvider: (LLMProvider) => {
      set((state) => {
        state.LLMProvider = LLMProvider
      })
    },
    setLLMBaseUrl: (LLMBaseUrl) => {
      set((state) => {
        state.LLMBaseUrl = LLMBaseUrl
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
