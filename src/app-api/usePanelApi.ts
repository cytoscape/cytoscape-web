// src/app-api/usePanelApi.ts
//
// React hook for the Panel API.

import { useAppContext } from './AppIdContext'
import { panelApi } from './core/panelApi'
import type { PanelApi } from './types/PanelTypes'

export type { PanelApi }

/**
 * The calling app's `PanelApi` — the same instance as `context.apis.panel`
 * from `mount()` — so that `open` prefers this app's own tab when two apps
 * registered the same id. Outside the app-context boundary there is no caller
 * to prefer, and the hook returns the anonymous `window.CyWebApi.panel`.
 */
export const usePanelApi = (): PanelApi =>
  useAppContext()?.apis.panel ?? panelApi
