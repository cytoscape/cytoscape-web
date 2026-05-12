// src/features/AppManager/PluginErrorBoundary.tsx
//
// Per-resource error boundary for plugin-owned UI. Isolates rendering
// failures so that one broken plugin component cannot crash an entire
// panel or menu region.
//
// Uses react-error-boundary (same library as ErrorHandler.tsx).

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ReactNode } from 'react'
import {
  ErrorBoundary as ReactErrorBoundary,
  type FallbackProps,
} from 'react-error-boundary'

import { logApp } from '../../debug'
import type { ResourceSlot } from '../../models/AppModel/RegisteredAppResource'

interface PluginErrorBoundaryProps {
  appId: string
  slot: ResourceSlot
  children: ReactNode
  /**
   * Optional plugin-provided fallback component. If supplied, it is used
   * instead of the host default. This lets plugin authors provide contextual
   * error messages and a "Retry" button via resetErrorBoundary.
   */
  customFallback?: React.ComponentType<FallbackProps>
}

/**
 * Default fallback shown when a plugin resource throws a render error.
 * Displays appId and slot for debugging.
 */
const PluginFallback = ({
  appId,
  slot,
}: {
  appId: string
  slot: ResourceSlot
}): ReactNode => (
  <Box sx={{ p: 2, textAlign: 'center' }} role="alert">
    <Typography variant="body2" color="text.secondary">
      Plugin unavailable ({appId} / {slot})
    </Typography>
  </Box>
)

export const PluginErrorBoundary = ({
  appId,
  slot,
  children,
  customFallback,
}: PluginErrorBoundaryProps): ReactNode => (
  <ReactErrorBoundary
    FallbackComponent={
      customFallback ??
      (() => <PluginFallback appId={appId} slot={slot} />)
    }
    onError={(error, info) => {
      logApp.error(
        `[PluginErrorBoundary]: render error in ${appId}/${slot}`,
        error,
        info,
      )
    }}
  >
    {children}
  </ReactErrorBoundary>
)
