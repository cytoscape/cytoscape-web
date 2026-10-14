// src/app-api/useTableApi.ts
import type { TableApi } from './core/tableApi'
import { tableApi } from './core/tableApi'

export type { TableApi }
export const useTableApi = (): TableApi => tableApi
