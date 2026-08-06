import { Box } from '@mui/material'
import { ReactElement, useContext, useEffect, useRef, useState } from 'react'
import {
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { AppConfigContext } from '../AppConfigContext'
import { markBoot } from '../boot/metrics/bootMarks'
import { BootShell } from '../boot/shell/BootShell'
import { runAppShellBoot } from '../boot/steps/runAppShellBoot'
import { useAppStore } from '../data/hooks/stores/AppStore'
import { useMessageStore } from '../data/hooks/stores/MessageStore'
import { useAppManager } from '../data/hooks/stores/useAppManager'
import { useLoadNetworkSummaries } from '../data/hooks/useLoadNetworkSummaries'
import { logStartup } from '../debug'
import type { PendingAppInstall } from '../models/AppModel/PendingAppInstall'
import { MessageSeverity } from '../models/MessageModel'
import { AppDialogHost } from './AppManager/AppDialogHost'
import { AppInstallConfirmationDialog } from './AppManager/AppInstallConfirmationDialog'
import { installConfirmedApps } from './AppManager/install/installConfirmedApps'
import { AppManagerCommandsProvider } from './AppManager/AppManagerCommandsContext'
import { markCrossTabSyncReady } from '@/data/sync/crossTabSyncGate'
import { SyncTabsAction } from './SyncTabs'
import { ToolBar } from './ToolBar'

/**
 * Application shell: the toolbar plus the routed content region.
 *
 * Startup itself lives in src/boot/steps/ — this component owns only the
 * React-side concerns (the mount-time URL snapshot, the run-once guard, and
 * the app-install confirmation prompt) and delegates the rest to
 * runAppShellBoot.
 */
const AppShell = (): ReactElement => {
  const appManagerCommands = useAppManager()
  const params = useParams()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const loadNetworkSummaries = useLoadNetworkSummaries()
  const { appInstallAllowedOrigins } = useContext(AppConfigContext)

  const addMessage = useMessageStore((state) => state.addMessage)
  const addService = useAppStore((state) => state.addService)

  // Apps requested via ?installApp=, awaiting user confirmation.
  const [pendingAppInstalls, setPendingAppInstalls] = useState<
    PendingAppInstall[]
  >([])

  const initialized = useRef(false)

  // One-shot startup effect (URL-as-state pattern): snapshots the mount-time
  // search params / route and hydrates stores exactly once (ref-guarded, so it
  // also survives StrictMode's double invoke). Re-running with fresh router
  // values is never correct — it would re-import networks and re-navigate
  // after its own URL cleanup.
  useEffect(() => {
    if (initialized.current) {
      return
    }
    initialized.current = true
    markBoot('app-shell-mounted')

    void runAppShellBoot({
      search,
      networkIdParam: params.networkId,
      // Read directly rather than through useLocation: the value is only used
      // in an error message, and subscribing would re-render this component on
      // every navigation for the life of the app.
      pathname: window.location.pathname,
      navigate,
      loadNetworkSummaries,
      appInstallAllowedOrigins,
    })
      .then(({ pendingAppInstalls: pending }) => {
        if (pending.length > 0) {
          setPendingAppInstalls(pending)
        }
      })
      // runAppShellBoot isolates its own phases, so reaching here means the
      // failure was outside them — navigate() throwing, or the callback above.
      // Without this the rejection is unhandled and, because workspaceId never
      // becomes defined, the user sits on the content shell with no diagnostic
      // and no retry (the run-once ref blocks one).
      .catch((error) => {
        logStartup.error('[boot]: app shell boot failed', error)
        addMessage({
          message: `Startup did not complete: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
          duration: 8000,
          severity: MessageSeverity.ERROR,
        })
      })
      // Cross-tab hydration stays gated until the boot settles, so a peer tab's
      // change cannot race the workspace load. `finally` rather than `then` — a
      // failed boot must not disable sync for the rest of the session.
      .finally(() => {
        markCrossTabSyncReady()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-guarded run-once init; snapshots URL state by design
  }, [])

  const handleConfirmAppInstalls = (): void => {
    const confirmed = pendingAppInstalls
    // Cleared before the awaits so the dialog closes on the click, not when the
    // last install settles.
    setPendingAppInstalls([])
    void installConfirmedApps(confirmed, {
      installApp: appManagerCommands.installApp,
      addService,
      addMessage,
      warn: (message, error) =>
        logStartup.warn(`[AppShell]: ${message}`, error),
    })
  }

  return (
    <AppManagerCommandsProvider value={appManagerCommands}>
      <Box
        data-testid="app-shell"
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          boxSizing: 'border-box',
          flexDirection: 'column',
        }}
      >
        <Box data-testid="app-shell-toolbar-container" sx={{ p: 0, margin: 0 }}>
          <ToolBar />
        </Box>
        <Box
          data-testid="app-shell-content-container"
          sx={{ flexGrow: 1, height: '100%', p: 0, margin: 0 }}
        >
          {/*
            Until initializeAppShell's navigate() lands on /:workspaceId, no
            child route matches and <Outlet/> renders nothing — which used to
            leave the real toolbar sitting over blank white with no loading
            affordance at all, for the whole duration of workspace hydration
            (including a possible auth-gated NDEx round-trip). Keep the boot
            shell's content region until the route resolves.
          */}
          {params.workspaceId === undefined ? (
            <BootShell region="content" />
          ) : (
            <Outlet />
          )}
        </Box>
        <SyncTabsAction />
      </Box>
      <AppInstallConfirmationDialog
        pending={pendingAppInstalls}
        onConfirm={handleConfirmAppInstalls}
        onCancel={() => setPendingAppInstalls([])}
      />
      <AppDialogHost />
    </AppManagerCommandsProvider>
  )
}

export default AppShell
