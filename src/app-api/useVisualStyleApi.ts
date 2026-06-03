// src/app-api/useVisualStyleApi.ts
import type { VisualStyleApi } from './core/visualStyleApi'
import { visualStyleApi } from './core/visualStyleApi'

export type { VisualStyleApi }
export const useVisualStyleApi = (): VisualStyleApi => visualStyleApi
