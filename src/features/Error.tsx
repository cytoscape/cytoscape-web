import {
  Alert,
  Button,
  CircularProgress,
  Grid,
  Snackbar,
  Typography,
} from '@mui/material'
import debounce from 'lodash/debounce'
import {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  isRouteErrorResponse,
  useHref,
  useLocation,
  useNavigate,
  useRouteError,
} from 'react-router-dom'

import { type AppConfig, AppConfigContext } from '../AppConfigContext'
import {
  type DatabaseSnapshot,
  exportDatabaseSnapshot,
} from '../data/db/snapshot'
import {
  createCrashReportPayload,
  exportPartialSnapshotForNetwork,
  sendErrorReport,
} from '../data/external-api/error-report'
import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'
import { useCrashDataConsent } from '../data/hooks/useCrashDataConsent'
import { logDb } from '../debug'

export const Error = (): ReactElement => {
  const error: any = useRouteError()
  const navigate = useNavigate()
  const location = useLocation()
  // Root path with the router basename applied, so a deployment under a
  // sub-path does not reload to the wrong origin root.
  const rootHref = useHref('/')
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const appConfig = useContext<AppConfig>(AppConfigContext)
  const { hasConsented } = useCrashDataConsent()

  const [isSendingReport, setIsSendingReport] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const hasReportedRef = useRef(false)

  useEffect(() => {
    // Force to block infinite redirect and navigate to the error URL
    navigate('/error', { replace: true })
  }, [navigate])

  const sendErrorReportAsync = useCallback(async (): Promise<void> => {
    if (
      !appConfig.errorReportEndpoint ||
      appConfig.errorReportEndpoint === ''
    ) {
      return
    }

    setIsSendingReport(true)
    setReportError(null)

    try {
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error'
      const errorStack = error?.stack
      const errorRoute = location.pathname

      const maxSizeBytes = appConfig.maxErrorReportSnapshotSizeMB * 1024 * 1024

      let snapshot: DatabaseSnapshot
      let snapshotType: 'full' | 'partial'
      let snapshotSizeBytes: number

      try {
        // Try to export full database snapshot
        const fullSnapshot = await exportDatabaseSnapshot()
        const fullSnapshotSizeBytes = new Blob([fullSnapshot]).size

        if (fullSnapshotSizeBytes <= maxSizeBytes) {
          // Full snapshot is within size limit
          snapshot = JSON.parse(fullSnapshot) as DatabaseSnapshot
          snapshotType = 'full'
          snapshotSizeBytes = fullSnapshotSizeBytes
          logDb.info(
            `[Error] Using full snapshot (${fullSnapshotSizeBytes} bytes) for error report`,
          )
        } else {
          // Snapshot is too large, try to export partial snapshot with just the current network
          if (currentNetworkId && currentNetworkId !== '') {
            try {
              const partialSnapshot =
                await exportPartialSnapshotForNetwork(currentNetworkId)
              snapshotType = 'partial'
              snapshot = partialSnapshot
              snapshotSizeBytes = new Blob([JSON.stringify(partialSnapshot)])
                .size
              logDb.info(
                `[Error] Full snapshot too large (${fullSnapshotSizeBytes} bytes), using partial snapshot for ${currentNetworkId} (${snapshotSizeBytes} bytes)`,
              )
            } catch (networkError) {
              // If partial snapshot export fails, send error report with failure message
              logDb.error(
                '[Error] Failed to export partial snapshot:',
                networkError,
              )
              const errorSnapshot: DatabaseSnapshot = {
                metadata: {
                  version: 0,
                  exportDate: new Date().toISOString(),
                  exportVersion: 'unknown',
                },
                data: {},
              }
              snapshot = errorSnapshot
              snapshotType = 'partial'
              snapshotSizeBytes = new Blob([JSON.stringify(errorSnapshot)]).size
            }
          } else {
            // No network ID available, send error report with failure message
            logDb.warn(
              '[Error] Full snapshot too large and no network ID available',
            )
            const errorSnapshot: DatabaseSnapshot = {
              metadata: {
                version: 0,
                exportDate: new Date().toISOString(),
                exportVersion: 'unknown',
              },
              data: {},
            }
            snapshot = errorSnapshot
            snapshotType = 'partial'
            snapshotSizeBytes = new Blob([JSON.stringify(errorSnapshot)]).size
          }
        }
      } catch (snapshotError) {
        // If snapshot export fails, send error report with failure message
        logDb.error('[Error] Failed to export snapshot:', snapshotError)
        const errorSnapshot: DatabaseSnapshot = {
          metadata: {
            version: 0,
            exportDate: new Date().toISOString(),
            exportVersion: 'unknown',
          },
          data: {},
        }
        snapshot = errorSnapshot
        snapshotType = 'partial'
        snapshotSizeBytes = new Blob([JSON.stringify(errorSnapshot)]).size
      }

      const routeMatch = location.pathname.match(
        /^\/(?<workspaceId>[^/]+)(?:\/networks\/(?<networkId>[^/?#]+))?/,
      )
      const workspaceId = routeMatch?.groups?.workspaceId
      const networkId =
        routeMatch?.groups?.networkId || currentNetworkId || undefined

      const payload = createCrashReportPayload({
        url: window.location.href,
        route: errorRoute,
        workspaceId,
        networkId,
        snapshot,
        snapshotType,
        snapshotSizeBytes,
        error: {
          name: error?.name,
          message: errorMessage,
          stack: errorStack,
          ...(isRouteErrorResponse(error) && {
            routeErrorResponse: {
              status: (error as any)?.status,
              statusText: (error as any)?.statusText,
            },
          }),
        },
      })

      await sendErrorReport(payload)

      setReportSent(true)
      logDb.info('[Error] Error report sent successfully')
    } catch (e: unknown) {
      logDb.error('[Error] Failed to send error report:', e)
      setReportError(
        e instanceof Error
          ? (e as Error).message
          : 'Failed to send error report',
      )
    } finally {
      setIsSendingReport(false)
    }
  }, [appConfig, error, location, currentNetworkId])

  // Send error report if user has consented
  useEffect(() => {
    if (hasConsented && !hasReportedRef.current) {
      hasReportedRef.current = true
      sendErrorReportAsync()
    }
  }, [hasConsented, sendErrorReportAsync])

  /**
   * This is the reset a stuck user is most likely to reach, so every path has to
   * end somewhere: the button shows progress while the reset runs (deleting the
   * database can wait on another tab that still has it open), and both failure
   * modes report rather than leaving a dead button.
   */
  const handleReset = (): void => {
    setIsResetting(true)
    setResetError(null)
    resetWorkspace()
      .then((outcome) => {
        if (outcome.status === 'failed') {
          setIsResetting(false)
          setResetError(outcome.reason)
          return
        }

        if (outcome.status === 'reload-required') {
          // No usable database connection remains — reload straight away
          // instead of waiting out the debounce.
          window.location.assign(rootHref)
          return
        }

        debounce(() => {
          navigate('/')
          navigate(0)
        }, 1500)()
      })
      .catch((e) => {
        logDb.error('[Error] Workspace reset threw', e)
        setIsResetting(false)
        setResetError('The reset failed unexpectedly. Please try again.')
      })
  }

  const handleCloseSnackbar = (): void => {
    setReportSent(false)
    setReportError(null)
  }

  let status = 'Unknown'

  if (isRouteErrorResponse(error)) {
    const { statusText } = error
    status = statusText
  }

  return (
    <>
      <Grid
        container
        direction="column"
        alignItems="left"
        justifyContent="center"
        spacing={2}
        sx={{ padding: 2 }}
      >
        <Grid item xs={12}>
          <Typography variant="h4">Error:</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>An unexpected error has occurred.</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2">
            <i>Error status: {status}</i>
          </Typography>
        </Grid>
        {isSendingReport && (
          <Grid item xs={12}>
            <Grid container spacing={1} alignItems="center">
              <Grid item>
                <CircularProgress size={20} />
              </Grid>
              <Grid item>
                <Typography variant="body2" color="text.secondary">
                  Sending error report...
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        )}
        <Grid item xs={12}>
          <Typography variant="body1">
            Your local cache might contain outdated workspace data and it can be
            the cause of this error. Please reset your local workspace cache and
            restart the app using the button below.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Button
            data-testid="error-reset-workspace-button"
            variant="outlined"
            color={'warning'}
            onClick={handleReset}
            disabled={isResetting}
            startIcon={isResetting ? <CircularProgress size={16} /> : undefined}
          >
            {isResetting
              ? 'Resetting workspace...'
              : 'Reset Workspace and Reload Cytoscape'}
          </Button>
        </Grid>
        {resetError !== null && (
          <Grid item xs={12}>
            <Alert
              data-testid="error-reset-workspace-error"
              severity="error"
              onClose={() => setResetError(null)}
            >
              {resetError}
            </Alert>
          </Grid>
        )}
      </Grid>
      <Snackbar
        open={reportSent}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ width: '100%' }}
        >
          Error report sent successfully. Thank you for helping us improve
          Cytoscape Web.
        </Alert>
      </Snackbar>
      {reportError && (
        <Snackbar
          open={!!reportError}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity="error"
            sx={{ width: '100%' }}
          >
            Failed to send error report: {reportError}
          </Alert>
        </Snackbar>
      )}
    </>
  )
}
