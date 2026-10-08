// src/features/AppManager/ModalLauncherHost.tsx
//
// Renders every open 'modal-launcher' resource inside the host-owned
// AppDialogShell. Always mounted (from AppShell), so an app modal opened
// from a transient surface — a search provider's onSubmit, an item in the
// Apps dropdown — survives its launcher's unmount. The shell supplies the
// dialog-dismissal policy, the structural Close "X" and Escape handling,
// all wired to the same close path as the injected requestClose; the app's
// component renders the dialog contents (DialogTitle/DialogContent/
// DialogActions).

import type { ModalHostProps } from '../../app-api/types/AppResourceTypes'
import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useModalLauncherStore } from '../../data/hooks/stores/ModalLauncherStore'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { AppDialogShell } from './AppDialogShell'

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
          <AppDialogShell
            key={`${appId}::modal-launcher::${id}`}
            appId={appId}
            slot="modal-launcher"
            dataTestId={`modal-launcher-dialog-${appId}-${id}`}
            closeButtonTestId="modal-launcher-close-button"
            maxWidth={resource.maxWidth}
            fullWidth={resource.fullWidth}
            onClose={requestClose}
            errorFallback={resource.errorFallback}
          >
            <ModalComponent requestClose={requestClose} />
          </AppDialogShell>
        )
      })}
    </>
  )
}
