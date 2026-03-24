import { useEffect, useRef, useState } from 'react'

import { logApp } from '../../../debug'
import { obtainCatalogEntries } from '../../../features/AppManager/manifest/obtainCatalogEntries'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { CyApp } from '../../../models/AppModel/CyApp'
import { getAppSettingFromDb } from '../../db'
import { unmountAllApps, unmountApp } from './appLifecycle'
// NOTE: mountApp, buildPerAppApis, processDeclarativeResources will be
// re-introduced in Phase 4 Step 4 (startup auto-load and activation).
import { useAppStore } from './AppStore'

// Fast ID-to-CyApp lookup for lifecycle calls.
// Starts empty — apps are loaded dynamically at runtime (Phase 4).
export const appRegistry = new Map<string, CyApp>()

export const useAppManager = (): void => {
  const initRef = useRef<boolean>(false)
  // Track last processed app state to prevent unnecessary re-runs
  const lastAppsState = useRef<string>('')
  // Track apps where mount() was successfully called
  const mountedApps = useRef<Set<string>>(new Set())
  // True once restore() has completed. The lifecycle useEffect must not run
  // before this, because apps would still be empty ({}) and every app would
  // incorrectly appear as a fresh (never-registered) registration, causing
  // mount() to be called before the persisted Inactive status is known.
  const [restored, setRestored] = useState<boolean>(false)

  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const restore = useAppStore((state) => state.restore)
  const setCatalog = useAppStore((state) => state.setCatalog)
  const setManifestSource = useAppStore((state) => state.setManifestSource)

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
      }

      void init()
    }

    return () => {
      logApp.info(`[${useAppManager.name}]: App Manager unmounted`)
    }
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
