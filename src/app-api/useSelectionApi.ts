// src/app-api/useSelectionApi.ts
import type { SelectionApi } from './core/selectionApi'
import { selectionApi } from './core/selectionApi'

export type { SelectionApi }
export const useSelectionApi = (): SelectionApi => selectionApi
