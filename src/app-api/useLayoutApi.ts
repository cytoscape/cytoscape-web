// src/app-api/useLayoutApi.ts
// Thin React hook wrapper around the framework-agnostic layoutApi core.

import { LayoutApi, layoutApi } from './core/layoutApi'

export type { LayoutApi }

export const useLayoutApi = (): LayoutApi => layoutApi
