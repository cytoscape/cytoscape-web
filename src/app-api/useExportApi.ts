// src/app-api/useExportApi.ts
// Thin React hook wrapper around the framework-agnostic exportApi core.

import { ExportApi, exportApi } from './core/exportApi'

export type { ExportApi }

export const useExportApi = (): ExportApi => exportApi
