import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material'
import {
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Refresh,
} from '@mui/icons-material'
import { useEffect, useState, useCallback } from 'react'
import { useFeatureAvailability } from './FeatureAvailabilityProvider'
import { PermissionState } from './FeatureAvailabilityContext'
import { useOpenNetworkInCytoscape } from '../../data/hooks/useOpenInCytoscapeDesktop'
// @ts-expect-error-next-line
import { CyNDEx } from '@js4cytoscape/ndex-client'
import { Network } from '../../models/NetworkModel'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { NetworkView } from '../../models/ViewModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'

type DialogPhase =
  | 'permissions'
  | 'connection-check'
  | 'opening'
  | 'success'
  | 'error'

interface OpenInCytoscapeDialogProps {
  open: boolean
  onClose: () => void
  network: Network
  networkLabel?: string
  visualStyle: VisualStyle
  summary: NetworkSummary | undefined
  table: TableRecord
  visualStyleOptions: VisualStyleOptions
  viewModel: NetworkView | undefined
  opaqueAspects: OpaqueAspects | undefined
}

const isChromeBased = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase()
  // Check for Chrome (but not Edge, which also contains 'chrome' in user agent)
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg')
  // Also check for Chromium-based browsers
  return isChrome || userAgent.includes('chromium')
}

export const OpenInCytoscapeDialog = ({
  open,
  onClose,
  network,
  networkLabel,
  visualStyle,
  summary,
  table,
  visualStyleOptions,
  viewModel,
  opaqueAspects,
}: OpenInCytoscapeDialogProps): JSX.Element => {
  const featureAvailabilityState = useFeatureAvailability()
  const openNetworkInCytoscape = useOpenNetworkInCytoscape()
  const cyndex = new CyNDEx()

  const [phase, setPhase] = useState<DialogPhase>('permissions')
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isPolling, setIsPolling] = useState(false)
  const isChrome = isChromeBased()

  // Check initial permission state when dialog opens
  useEffect(() => {
    if (open) {
      const checkInitialState = async (): Promise<void> => {
        // If Cytoscape is already available, skip to connection check phase
        if (featureAvailabilityState.state.isCyDeskAvailable) {
          setPhase('connection-check')
          setIsPolling(true)
          return
        }

        if (isChrome) {
          // For Chrome, start with permissions phase
          // User will click "Start Connection Check" which will test endpoint access
          const permState = await featureAvailabilityState.checkPermission()
          setPermissionState(permState)
          setPhase('permissions')
        } else {
          // Non-Chrome browsers skip permissions and test endpoint access directly
          setPhase('connection-check')
          const result = await featureAvailabilityState.startPolling()
          setIsPolling(true)
          // If we can't access endpoint, there might be an issue (unlikely for non-Chrome)
          if (!result.canAccessEndpoint) {
            setPhase('permissions')
          }
        }
      }
      void checkInitialState()
    } else {
      // Reset state when dialog closes
      setPhase('permissions')
      setPermissionState(null)
      setErrorMessage('')
      setIsPolling(false)
      featureAvailabilityState.stopPolling()
    }
    // Only run when dialog opens/closes, not when featureAvailabilityState changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isChrome])


  // Monitor Cytoscape availability when in connection-check phase
  useEffect(() => {
    if (phase === 'connection-check' && isPolling) {
      // The polling hook updates state.isCyDeskAvailable
      // This effect will re-run when that changes
    }
  }, [phase, isPolling, featureAvailabilityState.state.isCyDeskAvailable])

  const handleStartPolling = useCallback(async (): Promise<void> => {
    // Start polling - this will trigger the permission prompt via fetch request
    const result = await featureAvailabilityState.startPolling()
    setIsPolling(true)
    
    // If we can access the endpoint (even if Cytoscape isn't running),
    // it means permissions are fine and we can move to connection-check phase
    if (result.canAccessEndpoint) {
      setPhase('connection-check')
    } else {
      // Permission error - stay in permissions phase
      // The error message might be helpful for debugging
      setPermissionState('denied')
    }
  }, [featureAvailabilityState])

  const handleConfirm = async (): Promise<void> => {
    if (phase === 'connection-check') {
      // Move to opening phase
      setPhase('opening')

      const result = await openNetworkInCytoscape(
        network,
        visualStyle,
        summary,
        table,
        visualStyleOptions,
        viewModel,
        opaqueAspects,
        cyndex,
        networkLabel,
        true, // Suppress messages - we'll show them in the dialog
      )

      if (result.success) {
        // Success - move to success phase
        setPhase('success')
      } else {
        // Error - move to error phase
        setErrorMessage(
          result.error || 'Unable to open network in Cytoscape Desktop',
        )
        setPhase('error')
      }
    }
  }

  const handleRetry = (): void => {
    setPhase('connection-check')
    setErrorMessage('')
  }

  const networkName =
    networkLabel ?? summary?.name ?? `Network ${network.id}`

  const renderContent = (): JSX.Element => {
    switch (phase) {
      case 'permissions':
        return (
          <Box>
            <Typography variant="body1" paragraph>
              Cytoscape Web may need permission to communicate with Cytoscape Desktop.
            </Typography>

            <Box sx={{ my: 2 }}>

              {permissionState === 'granted' ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'success.main',
                    mb: 2,
                  }}
                >
                  <CheckCircle sx={{ mr: 1 }} />
                  <Typography>Permission granted</Typography>
                </Box>
              ) : permissionState === 'denied' ? (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                      Permission was denied. To enable it:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="1. Click the lock icon in Chrome's address bar"
                          secondary="Look for the lock icon next to the URL"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="2. Click 'Site settings'"
                          secondary="Scroll down to find 'Local network access'"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="3. Change 'Local network access' to 'Allow'"
                          secondary="The dialog will automatically detect the change"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              ) : (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary='1. Click "Start Connection Check" below'
                          secondary="This may trigger Chrome's permission prompt"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="2. Look for a chip or popup near the address bar"
                          secondary='The prompt will ask "Look for and connect to any device on your local network"'
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='3. Click "Allow" to grant permission'
                          secondary="The dialog will automatically detect the change"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              )}

              <Typography variant="body2" color="text.secondary">
                Learn more:{' '}
                <Link
                  href="https://developer.chrome.com/blog/local-network-access"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chrome Local Network Access Documentation
                </Link>
              </Typography>
            </Box>
          </Box>
        )

      case 'connection-check':
        return (
          <Box>

            <Box sx={{ my: 2 }}>
              <Typography variant="h6" gutterBottom>
                Opening network {networkName} in Cytoscape Desktop...
              </Typography>
              {featureAvailabilityState.state.isCyDeskAvailable ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'success.main',
                    mb: 2,
                  }}
                >
                  <CheckCircle sx={{ mr: 1 }} />
                  <Typography>
                    Cytoscape Desktop is running and connected
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'error.main',
                    mb: 2,
                  }}
                >
                  <ErrorIcon sx={{ mr: 1 }} />
                  <Typography>
                    Cytoscape Desktop is not detected. Please ensure Cytoscape
                    Desktop (version 3.8.0 or higher) is running and listening
                    on port 1234.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )

      case 'opening':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">
              Opening network in Cytoscape Desktop...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {networkName}
            </Typography>
          </Box>
        )

      case 'success':
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="medium">
                Network successfully opened in Cytoscape Desktop
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              The network "{networkName}" has been opened in Cytoscape Desktop.
            </Typography>
          </Box>
        )

      case 'error':
        return (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="medium">
                Unable to open network in Cytoscape Desktop
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {errorMessage ||
                'To use this feature, you need Cytoscape 3.6.0 or higher running on your machine (default port: 1234) and the CyNDEx-2 app installed.'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The network "{networkName}" could not be opened.
            </Typography>
          </Box>
        )

      default:
        return <Box />
    }
  }

  const renderActions = (): JSX.Element => {
    switch (phase) {
      case 'permissions':
        return (
          <>
            <Button onClick={onClose} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleStartPolling}
              variant="contained"
              color="primary"
              autoFocus
              disabled={permissionState === 'denied'}
            >
              Start Connection Check
            </Button>
          </>
        )

      case 'connection-check':
        return (
          <>
            <Button onClick={onClose} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              color="primary"
              autoFocus
              disabled={!featureAvailabilityState.state.isCyDeskAvailable}
            >
              Confirm
            </Button>
          </>
        )

      case 'opening':
        return (
          <Button onClick={onClose} color="primary" disabled>
            Opening...
          </Button>
        )

      case 'success':
        return (
          <Button onClick={onClose} variant="contained" color="primary" autoFocus>
            Close
          </Button>
        )

      case 'error':
        return (
          <>
            <Button onClick={onClose} color="primary">
              Close
            </Button>
            <Button
              onClick={handleRetry}
              variant="contained"
              color="primary"
              startIcon={<Refresh />}
            >
              Retry
            </Button>
          </>
        )

      default:
        return <Button onClick={onClose}>Close</Button>
    }
  }

  const getTitle = (): string => {
    switch (phase) {
      case 'permissions':
        return 'Enable Local Network Access for Cytoscape'
      case 'connection-check':
        return 'Open Network in Cytoscape Desktop'
      case 'opening':
        return 'Opening Network in Cytoscape Desktop'
      case 'success':
        return 'Network Opened Successfully'
      case 'error':
        return 'Unable to Open Network'
      default:
        return 'Open Network in Cytoscape Desktop'
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="open-in-cytoscape-dialog-title"
    >
      <DialogTitle id="open-in-cytoscape-dialog-title">
        {getTitle()}
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div">{renderContent()}</DialogContentText>
      </DialogContent>
      <DialogActions>{renderActions()}</DialogActions>
    </Dialog>
  )
}
