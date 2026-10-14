// src/app-api/useViewportApi.ts
import type { ViewportApi } from './core/viewportApi'
import { viewportApi } from './core/viewportApi'

export type { ViewportApi }
export const useViewportApi = (): ViewportApi => viewportApi
