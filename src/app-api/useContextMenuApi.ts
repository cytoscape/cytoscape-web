// src/app-api/useContextMenuApi.ts
//
// DEPRECATED — This hook is maintained only for backward compatibility with
// existing example apps that import from 'cyweb/ContextMenuApi'.
// It will be removed when all example apps are migrated in Step 2.9.
//
// New code should use:
//   - AppContext.apis.contextMenu (per-app factory, in mount())
//   - useAppContext().apis.contextMenu (in plugin components)
//   - window.CyWebApi.contextMenu (anonymous singleton, non-React only)

import type { ContextMenuApi } from './core/contextMenuApi'
import { contextMenuApi } from './core/contextMenuApi'

/** @deprecated Use AppContext.apis.contextMenu or useAppContext().apis.contextMenu instead. */
export const useContextMenuApi = (): ContextMenuApi => contextMenuApi
