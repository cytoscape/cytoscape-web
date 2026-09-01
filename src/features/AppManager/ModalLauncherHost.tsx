// src/features/AppManager/ModalLauncherHost.tsx
//
// Renders every open 'modal-launcher' resource as a host-owned CyDialog.
// Always mounted (from AppShell), so an app modal opened from a transient
// surface — a search provider's onSubmit, a menu item inside the Apps
// dropdown — survives its launcher's unmount. The shell renders a
// structural Close "X" wired to the same close path as the injected
// requestClose, so the dialog-dismissal policy holds even when the app
// component crashes or renders no exit of its own.

import CloseIcon from '@mui/icons-material/Close'
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material'
import { Suspense } from 'react'

import { AppIdProvider } from '../../app-api/AppIdContext'
import { buildPerAppApis } from '../../app-api/core/perAppApis'
import type { ModalHostProps } from '../../app-api/types/AppResourceTypes'
import { CyDialog } from '../../components/CyDialog'
import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useModalLauncherStore } from '../../data/hooks/stores/ModalLauncherStore'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { PluginErrorBoundary } from './PluginErrorBoundary'

export const ModalLauncherHost = (): JSX.Element => {
  const openModals = useModalLauncherStore((state) => state.openModals)
  const closeModal = useModalLauncherStore((state) => state.closeModal)
  const resources = useAppResourceStore((state) => state.resources)
  const apps = useAppStore((state) => state.apps)

  return (
    <>
      {openModals.map(({ appId, id }) => {
        const resource = resources.find(
          (r) =>
            r.appId === appId && r.slot === 'modal-launcher' && r.id === id,
        )
        // A stale entry (resource unregistered while open) or an inactive
        // app renders nothing — cleanupAllForApp prunes the entry itself.
        if (
          resource === undefined ||
          apps[appId]?.status !== AppStatus.Active
        ) {
          return null
        }

        const ModalComponent =
          resource.component as React.ComponentType<ModalHostProps>
        const requestClose = (): void => closeModal(appId, id)

        return (
          <CyDialog
            key={`${appId}::modal-launcher::${id}`}
            open
            maxWidth={resource.maxWidth ?? 'sm'}
            fullWidth={resource.fullWidth ?? false}
            data-testid={`modal-launcher-dialog-${appId}-${id}`}
          >
            <Tooltip title="Close">
              <IconButton
                data-testid="modal-launcher-close-button"
                aria-label="Close"
                size="small"
                onClick={requestClose}
                sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <AppIdProvider
              value={{ appId, apis: buildPerAppApis(appId) }}
            >
              <PluginErrorBoundary
                appId={appId}
                slot="modal-launcher"
                customFallback={resource.errorFallback as any}
              >
                <Suspense
                  fallback={
                    // Not null: a lazy modal chunk can be large, and an
                    // already-open dialog must not show an empty paper.
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', p: 6 }}
                    >
                      <CircularProgress />
                    </Box>
                  }
                >
                  <ModalComponent requestClose={requestClose} />
                </Suspense>
              </PluginErrorBoundary>
            </AppIdProvider>
          </CyDialog>
        )
      })}
    </>
  )
}
