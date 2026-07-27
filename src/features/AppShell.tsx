import { Box } from '@mui/material'
import { ReactElement, useEffect, useRef, useState } from 'react'
import {
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { markBoot } from '../boot/metrics/bootMarks'
import { BootShell } from '../boot/shell/BootShell'
import { runAppShellBoot } from '../boot/steps/runAppShellBoot'
import { useAppStore } from '../data/hooks/stores/AppStore'
import { useMessageStore } from '../data/hooks/stores/MessageStore'
import { useAppManager } from '../data/hooks/stores/useAppManager'
import { useLoadNetworkSummaries } from '../data/hooks/useLoadNetworkSummaries'
import { logStartup } from '../debug'
import { MessageSeverity } from '../models/MessageModel'
import { AppManagerCommandsProvider } from './AppManager/AppManagerCommandsContext'
import { ConfirmationDialog } from './ConfirmationDialog'
import { SyncTabsAction } from './SyncTabs'
import { ToolBar } from './ToolBar'

/**
 * Application shell: the toolbar plus the routed content region.
 *
 * Startup itself lives in src/boot/steps/ — this component owns only the
 * React-side concerns (the mount-time URL snapshot, the run-once guard, and
 * the service-app confirmation prompt) and delegates the rest to
 * runAppShellBoot.
 */
const AppShell = (): ReactElement => {
  const appManagerCommands = useAppManager()
  const params = useParams()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const loadNetworkSummaries = useLoadNetworkSummaries()

  const addMessage = useMessageStore((state) => state.addMessage)
  const addService = useAppStore((state) => state.addService)

  // Service-app URLs requested via ?addserviceapp=, awaiting user confirmation.
  const [serviceAppsToAdd, setServiceAppsToAdd] = useState<string[]>([])

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
      installApp: appManagerCommands.installApp,
    })
      .then(({ serviceAppUrlsNeedingConfirmation }) => {
        if (serviceAppUrlsNeedingConfirmation.length > 0) {
          setServiceAppsToAdd(serviceAppUrlsNeedingConfirmation)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-guarded run-once init; snapshots URL state by design
  }, [])

  const handleConfirmAddServiceApps = (): void => {
    const urls = serviceAppsToAdd
    setServiceAppsToAdd([])
    void (async () => {
      for (const url of urls) {
        try {
          await addService(url)
          addMessage({
            message: `Added service app: ${url}`,
            duration: 4000,
            severity: MessageSeverity.SUCCESS,
          })
        } catch (error) {
          addMessage({
            message: `Failed to add service app from ${url}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
            duration: 5000,
            severity: MessageSeverity.ERROR,
          })
          logStartup.warn(
            `[AppShell]: addserviceapp intent failed for ${url}`,
            error,
          )
        }
      }
    })()
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
      <ConfirmationDialog
        open={serviceAppsToAdd.length > 0}
        setOpen={(open) => {
          if (!open) {
            setServiceAppsToAdd([])
          }
        }}
        title="Add service app?"
        message={`This link wants to add the following service app${
          serviceAppsToAdd.length > 1 ? 's' : ''
        } to Cytoscape Web:\n\n${serviceAppsToAdd.join(
          '\n',
        )}\n\nOnly add service apps from sources you trust.`}
        buttonTitle="Add"
        onConfirm={handleConfirmAddServiceApps}
      />
    </AppManagerCommandsProvider>
  )
}

export default AppShell
