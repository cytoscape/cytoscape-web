// src/app-api/useContextMenuApi.ts
// Thin React hook wrapper — no domain logic.

import type { ContextMenuApi } from './core/contextMenuApi'
import { contextMenuApi } from './core/contextMenuApi'

export const useContextMenuApi = (): ContextMenuApi => contextMenuApi
