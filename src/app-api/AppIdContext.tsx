// src/app-api/AppIdContext.tsx
//
// Host-provided React Context for plugin components (Phase 2).
// The host wraps every plugin resource in AppIdProvider at the rendering
// call site. Plugin components use useAppContext() to obtain both appId
// and the per-app apis object.

import { createContext, useContext } from 'react'

import type { AppContextApis } from './types/AppContext'

export interface AppIdContextValue {
  readonly appId: string
  readonly apis: AppContextApis
}

const AppIdContext = createContext<AppIdContextValue | null>(null)

/**
 * Hook for plugin components to access the per-app context.
 * Must be called from within a plugin component rendered by the host.
 * Returns null if called outside the app context boundary (e.g., in tests
 * without a provider).
 */
export const useAppContext = (): AppIdContextValue | null =>
  useContext(AppIdContext)

export const AppIdProvider = AppIdContext.Provider
