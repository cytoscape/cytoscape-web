import { useEffect, useRef, useState } from 'react'

import { CyWebApi } from '../../../app-api/core'
import { createContextMenuApi } from '../../../app-api/core/contextMenuApi'
import { createResourceApi } from '../../../app-api/core/resourceApi'
import type {
  AppContextApis,
  CyAppWithLifecycle,
} from '../../../app-api/types/AppContext'
import type {
  RegisterMenuItemOptions,
  RegisterPanelOptions,
} from '../../../app-api/types/AppResourceTypes'
import { logApp } from '../../../debug'
import { loadRemoteApp } from '../../../features/AppManager/loader/loadRemoteApp'
import { obtainCatalogEntries } from '../../../features/AppManager/manifest/obtainCatalogEntries'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { CyApp } from '../../../models/AppModel/CyApp'
import { getAppSettingFromDb } from '../../db'
import { mountApp, unmountAllApps, unmountApp } from './appLifecycle'
import { useAppStore } from './AppStore'

// Fast ID-to-CyApp lookup for lifecycle calls.
// Starts empty — apps are loaded dynamically at runtime (Phase 4).
export const appRegistry = new Map<string, CyApp>()

/**
 * Build a per-app AppContextApis object. Extends CyWebApi with
 * per-app resource and contextMenu factories bound to the given appId.
 */
function buildPerAppApis(appId: string): AppContextApis {
  return {
    ...CyWebApi,
    resource: createResourceApi(appId),
    contextMenu: createContextMenuApi(appId),
  }
}

/**
 * Process declarative `resources` on CyAppWithLifecycle. Registers each
 * entry in AppResourceStore before mountApp is called, so declarative
 * resources are available to renderers immediately.
 */
function processDeclarativeResources(cyApp: CyApp): void {
  const lifecycle = cyApp as CyAppWithLifecycle
  if (!lifecycle.resources || lifecycle.resources.length === 0) return

  const resourceApi = createResourceApi(cyApp.id)
  for (const entry of lifecycle.resources) {
    if (entry.slot === 'right-panel') {
      resourceApi.registerPanel(entry as RegisterPanelOptions)
    } else if (entry.slot === 'apps-menu') {
      resourceApi.registerMenuItem(entry as RegisterMenuItemOptions)
    } else {
      logApp.warn(
        `[useAppManager]: Unsupported slot '${entry.slot}' in declarative resources for ${cyApp.id}`,
      )
    }
  }
}

export const useAppManager = (): void => {
  const initRef = useRef<boolean>(false)
  // Track last processed app state to prevent unnecessary re-runs
  const lastAppsState = useRef<string>('')
  // Track apps where mount() was successfully called
  const mountedApps = useRef<Set<string>>(new Set())
  // Per-app async guard to prevent concurrent mount attempts
  const mountingApps = useRef<Set<string>>(new Set())
  // True once restore() has completed. The lifecycle useEffect must not run
  // before this, because apps would still be empty ({}) and every app would
  // incorrectly appear as a fresh (never-registered) registration, causing
  // mount() to be called before the persisted Inactive status is known.
  const [restored, setRestored] = useState<boolean>(false)

  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const restore = useAppStore((state) => state.restore)
  const registerApp = useAppStore((state) => state.add)
  const setCatalog = useAppStore((state) => state.setCatalog)
  const setLoadState = useAppStore((state) => state.setLoadState)
  const setManifestSource = useAppStore((state) => state.setManifestSource)
  const setStatus = useAppStore((state) => state.setStatus)

  /**
   * Activate and mount a single app. Handles async guard to prevent
   * concurrent mount attempts for the same app.
   *
   * Both startup auto-load and user-initiated activation call this helper.
   */
  const activateAndMount = async (id: string): Promise<void> => {
    if (mountedApps.current.has(id)) return
    if (mountingApps.current.has(id)) return

    mountingApps.current.add(id)
    try {
      const cyApp = appRegistry.get(id)
      if (cyApp === undefined) {
        logApp.warn(
          `[useAppManager]: activateAndMount called for "${id}" but not in appRegistry`,
        )
        return
      }

      registerApp(cyApp)
      processDeclarativeResources(cyApp)

      const context = { appId: id, apis: buildPerAppApis(id) }
      await mountApp(cyApp, context, mountedApps.current)
    } finally {
      mountingApps.current.delete(id)
    }
  }

  // Call unmount() on all mounted apps when the page is about to unload
  useEffect(() => {
    const handleUnload = (): void => {
      void unmountAllApps(appRegistry, mountedApps.current)
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  useEffect(() => {
    if (initRef.current === false) {
      const init = async (): Promise<void> => {
        // 1. Read persisted manifestSource from IndexedDB
        const savedSource = await getAppSettingFromDb('manifestSource')
        if (savedSource !== undefined) {
          setManifestSource(savedSource)
        }

        // 2. Resolve manifest (fetch or parse inline)
        const entries = await obtainCatalogEntries(savedSource)

        // 3. Populate catalog in AppStore
        setCatalog(entries)
        logApp.info(
          `[${useAppManager.name}]: Catalog loaded with ${entries.length} entries`,
        )

        // 4. Extract catalog app IDs for restore
        const catalogAppIds = entries.map((e) => e.id)

        // 5. Restore persisted app records (non-fatal on failure)
        try {
          await restore(catalogAppIds)
          logApp.info(
            `[${useAppManager.name}]: Apps restored from the local cache`,
          )
        } catch (error) {
          logApp.warn(
            `[${useAppManager.name}]: restore() failed, continuing with empty state:`,
            error,
          )
        }

        // 6. Unblock the lifecycle useEffect
        setRestored(true)

        // 7. Startup auto-load: select previously active apps and load them
        const restoredApps = useAppStore.getState().apps
        const catalog = useAppStore.getState().catalog
        const activeAppIds = Object.keys(restoredApps).filter(
          (id) =>
            restoredApps[id]?.status === AppStatus.Active &&
            catalog[id] !== undefined,
        )

        if (activeAppIds.length === 0) {
          logApp.info(
            `[${useAppManager.name}]: No active apps to auto-load at startup`,
          )
          return
        }

        // Set loadStates to 'loading' for all active apps
        for (const id of activeAppIds) {
          setLoadState(id, 'loading')
        }

        // Load all active apps in parallel
        const results = await Promise.allSettled(
          activeAppIds.map(async (id) => {
            const cyApp = await loadRemoteApp(id, catalog[id].url, appRegistry)
            if (cyApp === undefined) {
              throw new Error(`Failed to load remote app "${id}"`)
            }
            return { id, cyApp }
          }),
        )

        // Process results
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { id } = result.value
            try {
              await activateAndMount(id)
              setLoadState(id, 'loaded')
              logApp.info(
                `[${useAppManager.name}]: App "${id}" auto-loaded and mounted`,
              )
            } catch (error) {
              setLoadState(id, 'failed')
              setStatus(id, AppStatus.Error)
              logApp.warn(
                `[${useAppManager.name}]: App "${id}" loaded but mount failed:`,
                error,
              )
            }
          } else {
            // Extract app ID from the error — Promise.allSettled preserves order
            const id = activeAppIds[results.indexOf(result)]
            setLoadState(id, 'failed')
            setStatus(id, AppStatus.Error)
            logApp.warn(
              `[${useAppManager.name}]: Failed to load app "${id}":`,
              result.reason,
            )
          }
        }
      }

      void init()
    }

    return () => {
      logApp.info(`[${useAppManager.name}]: App Manager unmounted`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restore, setCatalog, setManifestSource])

  useEffect(() => {
    // Do not process any apps until restore() has completed. Without this guard,
    // the effect fires with apps={} (empty store) and treats every app as a fresh
    // registration, calling mount() before the persisted Inactive status is known.
    if (!restored) return

    // Create a stable string representation of apps state to detect actual changes
    const currentAppsState = JSON.stringify(
      Object.keys(apps).map((id) => ({
        id,
        status: apps[id]?.status,
      })),
    )

    // Skip if state hasn't actually changed (prevents unnecessary re-runs)
    if (currentAppsState === lastAppsState.current) {
      return
    }
    lastAppsState.current = currentAppsState

    // Monitor unmount triggers only — mounting is handled by startup auto-load
    // and user-initiated activation (Phase 4, Steps 4–5).
    for (const appId of Object.keys(apps)) {
      if (
        apps[appId]?.status === AppStatus.Inactive &&
        mountedApps.current.has(appId)
      ) {
        const cyApp = appRegistry.get(appId)
        if (cyApp !== undefined) {
          void unmountApp(cyApp, mountedApps.current)
        }
      }
    }

    initRef.current = true
  }, [apps, restored])
}
