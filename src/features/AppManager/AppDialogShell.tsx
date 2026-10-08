// src/features/AppManager/AppDialogShell.tsx
//
// The one host-owned dialog shell every app-supplied dialog body renders
// inside — used by ModalLauncherHost ('modal-launcher' resources) and
// AppDialogHost (apis.dialog.open()). Owning the chrome in one place is what
// lets an app render a real component in a dialog without that component
// ever controlling the dialog itself: CyDialog keeps backdrop click inert
// (docs/specifications/DIALOG_DISMISS_POLICY.md), the structural Close "X"
// guarantees a visible exit even when the body crashes into its error
// fallback or renders no button of its own, and the body runs under the
// app's context, an error boundary, and a Suspense boundary with a spinner
// for lazy chunks.
//
// Escape closes app dialogs — the one documented exception to the policy's
// button-only rule. CyDialog forces MUI's own Escape handling off, so the
// shell listens for the key itself on the dialog root (focus is trapped
// inside the topmost modal, so only that dialog receives it) and runs the
// same close path as the "X".

import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  CircularProgress,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material'
import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { AppIdProvider } from '../../app-api/AppIdContext'
import { buildPerAppApis } from '../../app-api/core/perAppApis'
import { CyDialog } from '../../components/CyDialog'
import type { PluginBoundarySlot } from './PluginErrorBoundary'
import { PluginErrorBoundary } from './PluginErrorBoundary'

export interface AppDialogShellProps {
  appId: string
  /** Which host surface the body belongs to; shown in the error fallback. */
  slot: PluginBoundarySlot
  /** `data-testid` of the dialog root. */
  dataTestId: string
  /** `data-testid` of the structural Close "X". */
  closeButtonTestId: string
  /** MUI Dialog `maxWidth`. Defaults to 'sm'. */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  /** MUI Dialog `fullWidth`. Defaults to false. */
  fullWidth?: boolean
  /**
   * Host-rendered title bar. Omit when the body renders its own
   * DialogTitle (the 'modal-launcher' contract).
   */
  title?: string
  /** The one close path — wired to the Close "X" and handed to the body. */
  onClose: () => void
  /** App-supplied error fallback component, if any (typed unknown in the model). */
  errorFallback?: unknown
  children: ReactNode
}

export const AppDialogShell = ({
  appId,
  slot,
  dataTestId,
  closeButtonTestId,
  maxWidth,
  fullWidth,
  title,
  onClose,
  errorFallback,
  children,
}: AppDialogShellProps): JSX.Element => (
  <CyDialog
    open
    maxWidth={maxWidth ?? 'sm'}
    fullWidth={fullWidth ?? false}
    data-testid={dataTestId}
    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }}
  >
    <Tooltip title="Close">
      <IconButton
        data-testid={closeButtonTestId}
        aria-label="Close"
        size="small"
        onClick={onClose}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    {title !== undefined && (
      // Right padding keeps a long title clear of the absolutely
      // positioned Close "X".
      <DialogTitle sx={{ pr: 6 }}>{title}</DialogTitle>
    )}
    <AppIdProvider value={{ appId, apis: buildPerAppApis(appId) }}>
      <PluginErrorBoundary
        appId={appId}
        slot={slot}
        customFallback={errorFallback as any}
      >
        <Suspense
          fallback={
            // Not null: a lazy chunk can be large, and an already-open
            // dialog must not show an empty paper.
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          }
        >
          {children}
        </Suspense>
      </PluginErrorBoundary>
    </AppIdProvider>
  </CyDialog>
)
