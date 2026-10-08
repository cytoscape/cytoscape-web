// src/features/AppManager/AppDialogHost.tsx
//
// Renders every dialog currently open through apis.dialog.open(). Mounted
// once at the app shell root (see AppShell.tsx) so the API works from any
// app code — an 'apps-menu' onClick, mount(), a 'right-panel' component —
// and the dialog outlives whatever surface opened it.
//
// The host owns all chrome through AppDialogShell (title bar, Close "X",
// dismissal policy, error and Suspense boundaries); the app supplies only
// the body via `render`. This is the isolated modal layer that plain-data
// 'apps-menu' items delegate to instead of ever rendering a component
// inside the shared dropdown.

import { DialogContent } from '@mui/material'
import type { ReactElement, ReactNode } from 'react'

import type { DialogRenderProps } from '../../app-api/types/AppDialogTypes'
import { useAppDialogStore } from '../../data/hooks/stores/AppDialogStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { AppStatus } from '../../models/AppModel/AppStatus'
import type { RegisteredAppDialog } from '../../models/AppModel/RegisteredAppDialog'
import { AppDialogShell } from './AppDialogShell'

/**
 * Calls the app-supplied `render` inside its own component, so a throw
 * happens during THIS component's render phase and is caught by the
 * PluginErrorBoundary above it in the shell. Calling `render(...)` directly
 * as a JSX child expression in AppDialogEntry would evaluate it while
 * AppDialogEntry itself renders — before React descends into the boundary's
 * subtree — so a throw there would escape the boundary.
 */
const AppDialogBody = ({
  render,
  close,
}: {
  render: (props: DialogRenderProps) => ReactNode
  close: () => void
}): ReactElement => <>{render({ close })}</>

const AppDialogEntry = ({
  dialog,
}: {
  dialog: RegisteredAppDialog
}): ReactElement => {
  const closeDialog = useAppDialogStore((state) => state.closeDialog)
  const close = (): void => closeDialog(dialog.appId, dialog.id)
  const render = dialog.render as (props: DialogRenderProps) => ReactNode

  return (
    <AppDialogShell
      appId={dialog.appId}
      slot="dialog"
      dataTestId={`app-dialog-${dialog.appId}-${dialog.id}`}
      closeButtonTestId="app-dialog-close-button"
      maxWidth={dialog.maxWidth}
      fullWidth={dialog.fullWidth}
      title={dialog.title}
      onClose={close}
    >
      <DialogContent>
        <AppDialogBody render={render} close={close} />
      </DialogContent>
    </AppDialogShell>
  )
}

export const AppDialogHost = (): ReactElement => {
  const dialogs = useAppDialogStore((state) => state.dialogs)
  const apps = useAppStore((state) => state.apps)

  return (
    <>
      {dialogs
        // An inactive app renders nothing — cleanupAllForApp prunes the
        // entry itself when the app is deactivated.
        .filter((dialog) => apps[dialog.appId]?.status === AppStatus.Active)
        .map((dialog) => (
          <AppDialogEntry
            key={`${dialog.appId}::${dialog.id}`}
            dialog={dialog}
          />
        ))}
    </>
  )
}
