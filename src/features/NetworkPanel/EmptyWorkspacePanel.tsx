import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import ExploreIcon from '@mui/icons-material/Explore'
import HubIcon from '@mui/icons-material/Hub'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import { ReactElement } from 'react'

import logo from '@/assets/cytoscape.svg'
import { useLoadDemoNetworks } from '@/data/hooks/useLoadDemoNetworks'
import { useOnboardingStore } from '@/features/Onboarding/store/OnboardingStore'
import { DEFAULT_TOUR_ID } from '@/features/Onboarding/tours/registry'
import { useFileUploadDialogStore } from '@/features/ToolBar/DataMenu/store/fileUploadDialogStore'
import { useLoadFromNdexDialogStore } from '@/features/ToolBar/DataMenu/store/loadFromNdexDialogStore'

/**
 * Center-pane call to action for a workspace with no networks (#651).
 *
 * State-driven rather than first-run-driven: it shows whenever the workspace
 * is empty — a returning visitor, someone who dismissed the welcome dialog,
 * or anyone who just removed every network — which is what makes it
 * complementary to the first-run `WelcomeDialog` instead of redundant with
 * it. Every action is wired to an affordance that already exists behind the
 * toolbar menus; nothing here is a new way to load data.
 *
 * The actions hide while a tour is running so the panel never competes with
 * the joyride for the canvas (and never offers "Take a tour" mid-tour).
 */
export const EmptyWorkspacePanel = (): ReactElement => {
  const { loadDemoNetworks, status } = useLoadDemoNetworks()
  const openFileUploadDialog = useFileUploadDialogStore(
    (state) => state.openDialog,
  )
  const openNdexDialog = useLoadFromNdexDialogStore((state) => state.openDialog)
  const startTour = useOnboardingStore((state) => state.startTour)
  const tourActive = useOnboardingStore((state) => state.activeTour != null)

  const loading = status === 'loading'

  const handleOpenSamples = (): void => {
    void loadDemoNetworks()
  }
  const handleImportFile = (): void => {
    openFileUploadDialog()
  }
  const handleLoadFromNdex = (): void => {
    // Browse mode: openDialog(query) would treat a click event as the query.
    openNdexDialog()
  }
  const handleTakeTour = (): void => {
    startTour(DEFAULT_TOUR_ID)
  }

  return (
    <Box
      data-testid="empty-workspace-panel"
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        padding: '1em',
        overflow: 'auto',
        backgroundColor: (theme) => theme.palette.background.paper,
      }}
    >
      <Box
        sx={{
          margin: 'auto',
          maxWidth: 520,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 1,
        }}
      >
        <Box
          component="img"
          src={logo}
          alt=""
          sx={{ width: 64, height: 64, mb: 0.5 }}
        />
        <Typography variant="h5" component="h2">
          Welcome to Cytoscape Web
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Explore, style, and analyze biological networks right in your browser.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Your workspace is empty. Load a network to get started.
        </Typography>

        {!tourActive && (
          <>
            <Box
              sx={{
                mt: 2.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Button
                variant="contained"
                onClick={handleOpenSamples}
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <HubIcon />
                  )
                }
                data-testid="empty-workspace-open-samples"
              >
                {loading ? 'Opening sample networks…' : 'Open Sample Networks'}
              </Button>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={handleImportFile}
                  disabled={loading}
                  startIcon={<UploadFileIcon />}
                  data-testid="empty-workspace-import-file"
                >
                  Import from file
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleLoadFromNdex}
                  disabled={loading}
                  startIcon={<CloudDownloadIcon />}
                  data-testid="empty-workspace-load-ndex"
                >
                  Load from NDEx
                </Button>
              </Box>
            </Box>

            {status === 'error' && (
              <Alert
                severity="error"
                data-testid="empty-workspace-error"
                sx={{ mt: 2.5, width: '100%', textAlign: 'left' }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleOpenSamples}
                    data-testid="empty-workspace-retry"
                  >
                    Retry
                  </Button>
                }
              >
                Couldn’t open the sample networks. NDEx may be unreachable —
                check your connection and try again.
              </Alert>
            )}

            <Box
              sx={{
                mt: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                New here?
              </Typography>
              <Button
                variant="text"
                onClick={handleTakeTour}
                disabled={loading}
                startIcon={<ExploreIcon />}
                data-testid="empty-workspace-take-tour"
              >
                Take a tour
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}
