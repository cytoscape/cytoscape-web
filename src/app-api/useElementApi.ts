// src/app-api/useElementApi.ts
import type { ElementApi } from './core/elementApi'
import { elementApi } from './core/elementApi'

export type { ElementApi }
export const useElementApi = (): ElementApi => elementApi
