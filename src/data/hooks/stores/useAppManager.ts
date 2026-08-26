import { useContext, useEffect, useRef, useState } from 'react'

import { buildPerAppApis } from '../../../app-api/core/perAppApis'
import { createResourceApi } from '../../../app-api/core/resourceApi'
import type { CyAppWithLifecycle } from '../../../app-api/types/AppContext'
import type {
  RegisterMenuItemOptions,
  RegisterNetworkSearchProviderOptions,
  RegisterPanelOptions,
} from '../../../app-api/types/AppResourceTypes'
import { AppConfigContext } from '../../../AppConfigContext'
import { logApp } from '../../../debug'
import {
  isAllowedOrigin,
  isCatalogEntryAllowed,
  isHostCompatible,
} from '../../../features/AppManager/install/installGate'
import { migrateLegacyApps } from '../../../features/AppManager/install/migrateLegacyApps'
import { loadRemoteApp } from '../../../features/AppManager/loader/loadRemoteApp'
import { composeCatalog } from '../../../features/AppManager/manifest/composeCatalog'
import { obtainCatalogEntries } from '../../../features/AppManager/manifest/obtainCatalogEntries'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { CyApp } from '../../../models/AppModel/CyApp'
import { ManifestSource } from '../../../models/AppModel/ManifestSource'
import { MessageSeverity } from '../../../models/MessageModel'
import { getAppSettingFromDb } from '../../db'
import { cleanupAllForApp } from './AppCleanupRegistry'
import { mountApp, unmountAllApps, unmountApp } from './appLifecycle'
import { useAppStore } from './AppStore'
import { useMessageStore } from './MessageStore'
import { waitForWorkspaceHydration } from './waitForWorkspaceHydration'
import { useWorkspaceStore } from './WorkspaceStore'

// Fast ID-to-CyApp lookup for lifecycle calls.
// Starts empty — apps are loaded dynamically at runtime (Phase 4).
export const appRegistry = new Map<string, CyApp>()

/**
 * Command surface exposed by useAppManager.
 * UI components call these instead of manipulating AppStore directly.
 */
export interface AppManagerCommands {
  activateApp: (id: string) => Promise<void>
  deactivateApp: (id: string) => Promise<void>
  retryApp: (id: string) => Promise<void>
  refreshCatalog: () => Promise<void>
  setManifestSource: (source: ManifestSource | undefined) => void
  removeOrphan: (id: string) => void
  installApp: (
    entry: AppCatalogEntry,
    opts?: { activate?: boolean },
  ) => Promise<void>
  uninstallApp: (id: string) => Promise<void>
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
    } else if (entry.slot === 'search-bar') {
      resourceApi.registerNetworkSearchProvider(
        entry as RegisterNetworkSearchProviderOptions,
      )
    } else {
      // Statically unreachable (the union is exhaustive), but declarations
      // can arrive from untyped JS apps with any slot string at runtime.
      const unknownSlot = (entry as { slot: string }).slot
      logApp.warn(
        `[useAppManager]: Unsupported slot '${unknownSlot}' in declarative resources for ${cyApp.id}`,
      )
    }
  }
}

export const useAppManager = (): AppManagerCommands => {
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
  // Manifest entries from the last catalog load, used to recompose the catalog
  // (manifest ∪ installedApps) after install/uninstall.
  const manifestEntriesRef = useRef<AppCatalogEntry[]>([])

  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const restore = useAppStore((state) => state.restore)
  const registerApp = useAppStore((state) => state.add)
  const setCatalog = useAppStore((state) => state.setCatalog)
  const setLoadState = useAppStore((state) => state.setLoadState)
  const storeSetManifestSource = useAppStore((state) => state.setManifestSource)
  const setStatus = useAppStore((state) => state.setStatus)
  const removeApp = useAppStore((state) => state.remove)
  const addMessage = useMessageStore((state) => state.addMessage)
  const { appInstallAllowedOrigins, allowsLocalhostAppsOn } =
    useContext(AppConfigContext)

  /**
   * True if this catalog entry is one the deployment's own default manifest
   * currently lists — the only class `isCatalogEntryAllowed` exempts.
   *
   * Decided against the manifest as loaded, and matched on **url as well as
   * id**: `composeCatalog` lets an installed `appstore`/`snapshot` entry win a
   * collision with a manifest entry of the same id, so id alone would vouch for
   * a URL the manifest never named.
   */
  const isFromDefaultManifest = (
    id: string,
    url: string,
    manifestSource: ManifestSource | undefined,
  ): boolean =>
    manifestSource === undefined &&
    manifestEntriesRef.current.some((e) => e.id === id && e.url === url)

  /**
   * Recompose the catalog (manifest ∪ workspace.installedApps) and write it
   * back. Used after install/uninstall so the change is immediately visible.
   */
  const recomposeCatalog = (): void => {
    const installed = useWorkspaceStore.getState().workspace.installedApps ?? []
    const { entries, sources } = composeCatalog(
      manifestEntriesRef.current,
      installed,
    )
    setCatalog(entries, sources)
  }

  /**
   * Mirror an app's runtime status into the durable workspace record (§8.4).
   * Updates an existing InstalledApp; if none exists, a successful activation
   * creates a `source: 'manifest'` record (first activation of a manifest app).
   * Failures/deactivations with no record are no-ops.
   */
  const reconcileInstalledStatus = (id: string, status: AppStatus): void => {
    const ws = useWorkspaceStore.getState()
    const exists = (ws.workspace.installedApps ?? []).some(
      (a) => a.entry.id === id,
    )
    if (exists) {
      ws.setInstalledAppStatus(id, status)
      return
    }
    if (status === AppStatus.Active) {
      const entry = useAppStore.getState().catalog[id]
      if (entry !== undefined) {
        ws.addInstalledApp({
          entry,
          status: AppStatus.Active,
          source: 'manifest',
          installedAt: new Date().toISOString(),
        })
      }
    }
  }

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

      await registerApp(cyApp)
      processDeclarativeResources(cyApp)

      const context = { appId: id, apis: buildPerAppApis(id) }
      await mountApp(cyApp, context, mountedApps.current)
    } finally {
      mountingApps.current.delete(id)
    }
  }

  // ── Command implementations ──────────────────────────────────────

  const activateApp = async (id: string): Promise<void> => {
    const {
      catalog,
      manifestSource,
      loadStates,
      apps: currentApps,
    } = useAppStore.getState()
    const catalogEntry = catalog[id]
    if (catalogEntry === undefined) {
      logApp.warn(`[useAppManager]: activateApp: "${id}" not found in catalog`)
      return
    }

    // The trust boundary the catalog path used to skip entirely (§9/G-6).
    // Checked before the fast re-enable path too: a module already in memory
    // was loaded under whatever configuration applied then, and re-mounting it
    // under a configuration that now forbids it would keep the old decision
    // alive for the life of the tab.
    if (
      !isCatalogEntryAllowed(
        catalogEntry.url,
        isFromDefaultManifest(id, catalogEntry.url, manifestSource),
        appInstallAllowedOrigins,
        allowsLocalhostAppsOn,
      )
    ) {
      addMessage({
        message: `Cannot load "${catalogEntry.name ?? id}": its URL is not from an allowed origin.`,
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
      logApp.warn(
        `[useAppManager]: activateApp: "${id}" blocked — ${catalogEntry.url} is not from an allowed origin`,
      )
      setLoadState(id, 'failed')
      return
    }

    const currentLoadState = loadStates[id]
    const existedBefore = currentApps[id] !== undefined

    if (currentLoadState === 'loaded') {
      // Fast re-enable path — module already in memory
      try {
        await activateAndMount(id)
        setStatus(id, AppStatus.Active)
        reconcileInstalledStatus(id, AppStatus.Active)
        logApp.info(`[useAppManager]: App "${id}" re-enabled (fast path)`)
      } catch (error) {
        cleanupAllForApp(id)
        setLoadState(id, 'failed')
        logApp.warn(
          `[useAppManager]: App "${id}" re-enable mount failed:`,
          error,
        )
      }
      return
    }

    // Full load path (unloaded or failed)
    setLoadState(id, 'loading')

    const cyApp = await loadRemoteApp(id, catalogEntry.url, appRegistry)
    if (cyApp === undefined) {
      setLoadState(id, 'failed')
      if (existedBefore) {
        setStatus(id, AppStatus.Error)
        reconcileInstalledStatus(id, AppStatus.Error)
      }
      logApp.warn(`[useAppManager]: activateApp: failed to load "${id}"`)
      return
    }

    try {
      await activateAndMount(id)
      setStatus(id, AppStatus.Active)
      reconcileInstalledStatus(id, AppStatus.Active)
      setLoadState(id, 'loaded')
      logApp.info(`[useAppManager]: App "${id}" activated`)
    } catch (error) {
      cleanupAllForApp(id)
      if (!existedBefore) {
        removeApp(id)
      }
      setLoadState(id, 'failed')
      logApp.warn(
        `[useAppManager]: activateApp: mount failed for "${id}":`,
        error,
      )
    }
  }

  const deactivateApp = async (id: string): Promise<void> => {
    setStatus(id, AppStatus.Inactive)
    reconcileInstalledStatus(id, AppStatus.Inactive)
    const cyApp = appRegistry.get(id)
    if (cyApp !== undefined && mountedApps.current.has(id)) {
      await unmountApp(cyApp, mountedApps.current)
    }
    logApp.info(`[useAppManager]: App "${id}" deactivated`)
  }

  const retryApp = async (id: string): Promise<void> => {
    await activateApp(id)
  }

  const refreshCatalog = async (): Promise<void> => {
    const { manifestSource } = useAppStore.getState()
    const manifestEntries = await obtainCatalogEntries(manifestSource)
    manifestEntriesRef.current = manifestEntries
    const installedApps =
      useWorkspaceStore.getState().workspace.installedApps ?? []
    const { entries, sources } = composeCatalog(manifestEntries, installedApps)
    setCatalog(entries, sources)
    logApp.info(
      `[useAppManager]: Catalog refreshed with ${entries.length} entries`,
    )
  }

  /**
   * Install an app into the current workspace (§7.1). Validates the entry
   * against the origin allow-list and host-version compatibility, persists it
   * to workspace.installedApps (upsert → idempotent), merges it into the
   * catalog, and optionally activates it. Transport-agnostic: the URL install
   * intent and the App Manager "Install from URL" both call this.
   */
  const installApp = async (
    entry: AppCatalogEntry,
    opts?: { activate?: boolean },
  ): Promise<void> => {
    // 1. Trust boundary (§9)
    if (
      !isAllowedOrigin(
        entry.url,
        appInstallAllowedOrigins,
        allowsLocalhostAppsOn,
      )
    ) {
      addMessage({
        message: `Cannot install "${entry.name ?? entry.id}": its URL is not from an allowed origin.`,
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
      logApp.warn(
        `[useAppManager]: installApp rejected "${entry.id}" — origin not allowed: ${entry.url}`,
      )
      return
    }

    let activate = opts?.activate ?? false
    if (activate && !isHostCompatible(entry.compatibleHostVersions)) {
      activate = false
      addMessage({
        message: `"${entry.name ?? entry.id}" is not compatible with this host version; installed but not enabled.`,
        duration: 5000,
        severity: MessageSeverity.WARNING,
      })
    }

    // 2. Persist into the workspace (upsert → idempotent)
    useWorkspaceStore.getState().addInstalledApp({
      entry,
      status: activate ? AppStatus.Active : AppStatus.Inactive,
      source: 'appstore',
      installedAt: new Date().toISOString(),
    })

    // 3. Merge into the catalog so it appears immediately
    recomposeCatalog()
    logApp.info(
      `[useAppManager]: Installed app "${entry.id}" (activate=${activate})`,
    )

    // 4. Optionally load + mount
    if (activate) {
      await activateApp(entry.id)
    }
  }

  /**
   * Uninstall a workspace-installed app (§12.7). Deactivates it if running,
   * removes it from workspace.installedApps, clears session state, and drops
   * it from the catalog.
   */
  const uninstallApp = async (id: string): Promise<void> => {
    await deactivateApp(id)
    useWorkspaceStore.getState().removeInstalledApp(id)
    removeApp(id)
    appRegistry.delete(id)
    recomposeCatalog()
    logApp.info(`[useAppManager]: Uninstalled app "${id}"`)
  }

  const cmdSetManifestSource = (source: ManifestSource | undefined): void => {
    storeSetManifestSource(source)
  }

  const removeOrphan = (id: string): void => {
    removeApp(id)
    appRegistry.delete(id)
    logApp.info(`[useAppManager]: Orphan app "${id}" removed`)
  }

  // ── Effects ──────────────────────────────────────────────────────

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
          storeSetManifestSource(savedSource)
        }

        // 2. Resolve manifest (fetch or parse inline) and cache the manifest
        //    entries so installApp/uninstallApp can recompose the catalog.
        const manifestEntries = await obtainCatalogEntries(savedSource)
        manifestEntriesRef.current = manifestEntries

        // 3. Wait for workspace hydration so workspace.installedApps is
        //    available before composing/restoring the catalog (§8.3).
        await waitForWorkspaceHydration()
        const installedApps =
          useWorkspaceStore.getState().workspace.installedApps ?? []

        // 4. Populate catalog in AppStore as manifest ∪ installedApps (§8.1)
        const { entries, sources } = composeCatalog(
          manifestEntries,
          installedApps,
        )
        setCatalog(entries, sources)
        logApp.info(
          `[${useAppManager.name}]: Catalog loaded with ${entries.length} entries`,
        )

        // 5. One-time runtime migration of the legacy global apps store into
        //    the workspace's installedApps (§10.1). Runs after the catalog is
        //    composed (URLs resolvable) and before restore/auto-load so the
        //    restore seed below includes migrated apps. Idempotent.
        await migrateLegacyApps({
          catalog: useAppStore.getState().catalog,
          installedAppIds: new Set(installedApps.map((a) => a.entry.id)),
          addInstalledApp: useWorkspaceStore.getState().addInstalledApp,
        })

        // 6. Restore the session apps map by seeding it from the workspace's
        //    installedApps (the durable status source, §8.4), not the legacy
        //    global apps store. Non-fatal on failure.
        const catalogIdSet = new Set(entries.map((e) => e.id))
        const seedApps: CyApp[] = (
          useWorkspaceStore.getState().workspace.installedApps ?? []
        )
          .filter((a) => catalogIdSet.has(a.entry.id))
          .map((a) => ({
            id: a.entry.id,
            name: a.entry.name ?? a.entry.id,
            ...(a.entry.description !== undefined && {
              description: a.entry.description,
            }),
            ...(a.entry.version !== undefined && { version: a.entry.version }),
            status: a.status,
          }))
        try {
          await restore(seedApps)
          logApp.info(
            `[${useAppManager.name}]: Apps restored from the workspace`,
          )
        } catch (error) {
          logApp.warn(
            `[${useAppManager.name}]: restore() failed, continuing with empty state:`,
            error,
          )
        }

        // 7. Unblock the lifecycle useEffect
        setRestored(true)

        // 8. Startup auto-load: the active set comes from the workspace's
        //    installed apps (the durable source of truth, §8.4), not the
        //    legacy global apps store.
        const installedAppList =
          useWorkspaceStore.getState().workspace.installedApps ?? []
        const { catalog, manifestSource } = useAppStore.getState()
        // Same gate as activateApp, and needed separately: this path loads
        // `catalog[id].url`, not the installed record's URL, so a user-set
        // manifest declaring an existing app's id would otherwise decide where
        // an already-trusted app is fetched from.
        const activeAppIds = installedAppList
          .filter(
            (a) =>
              a.status === AppStatus.Active &&
              catalog[a.entry.id] !== undefined,
          )
          .map((a) => a.entry.id)
          .filter((id) => {
            const allowed = isCatalogEntryAllowed(
              catalog[id].url,
              isFromDefaultManifest(id, catalog[id].url, manifestSource),
              appInstallAllowedOrigins,
              allowsLocalhostAppsOn,
            )
            if (!allowed) {
              setLoadState(id, 'failed')
              logApp.warn(
                `[useAppManager]: startup auto-load: "${id}" blocked — ${catalog[id].url} is not from an allowed origin`,
              )
            }
            return allowed
          })

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
  }, [restore, setCatalog, storeSetManifestSource])

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

  return {
    activateApp,
    deactivateApp,
    retryApp,
    refreshCatalog,
    setManifestSource: cmdSetManifestSource,
    removeOrphan,
    installApp,
    uninstallApp,
  }
}
