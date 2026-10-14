// src/app-api/useAppDataApi.ts
//
// React hook for the per-app data API.

import { useAppContext } from './AppIdContext'
import type { AppDataApi } from './types/AppDataTypes'

/**
 * The calling app's `AppDataApi`, or null outside the app-context boundary.
 *
 * Returns the same instance the host built in `buildPerAppApis`, so it is
 * interchangeable with `context.apis.appData` from `mount()`. Unlike the other
 * domain hooks it can return null: app data is scoped by `appId`, and a
 * component rendered outside `AppIdProvider` has no app identity to bind to.
 * Prefer `context.apis.appData` when you already hold the mount context.
 */
export const useAppDataApi = (): AppDataApi | null =>
  useAppContext()?.apis.appData ?? null
