// src/features/AppManager/AppDialogHost.tsx
//
// Renders every dialog currently open via apis.dialog.open(). Mounted once
// at the app shell root (see AppShell.tsx) so the API works regardless of
// which app code (an 'apps-menu' onClick, a mount() handler, a
// 'right-panel' component) called it.
//
// The host owns all chrome (title bar, close button, padding) — the app
// only supplies the body via `render`. This is the isolated modal layer
// that RegisterMenuItemOptions' onClick is meant to delegate to instead of
// ever registering a component as a menu item.

import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { Suspense } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { CyWebApi } from '../../app-api/core'
import { createContextMenuApi } from '../../app-api/core/contextMenuApi'
import { createDialogApi } from '../../app-api/core/dialogApi'
import { createResourceApi } from '../../app-api/core/resourceApi'
import { AppIdProvider } from '../../app-api/AppIdContext'
import type { AppContextApis } from '../../app-api/types/AppContext'
import type { DialogRenderProps } from '../../app-api/types/AppDialogTypes'
import { useAppDialogStore } from '../../data/hooks/stores/AppDialogStore'
import type { RegisteredAppDialog } from '../../models/AppModel/RegisteredAppDialog'
import { PluginErrorBoundary } from './PluginErrorBoundary'

/**
 * Calls the app-supplied `render` inside its own component, so a throw
 * happens during *this* component's render phase and is caught by the
 * PluginErrorBoundary ancestor. Calling `render(...)` directly as a JSX
 * child expression in AppDialogEntry would evaluate it while AppDialogEntry
 * itself is rendering — before React descends into the boundary's subtree —
 * so a throw there would propagate past the boundary instead of being caught.
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

  const perAppApis: AppContextApis = {
    ...CyWebApi,
    resource: createResourceApi(dialog.appId),
    contextMenu: createContextMenuApi(dialog.appId),
    dialog: createDialogApi(dialog.appId),
  }

  const render = dialog.render as (props: DialogRenderProps) => ReactNode

  return (
    <Dialog
      open
      maxWidth={dialog.maxWidth ?? 'sm'}
      fullWidth
      onClose={dialog.disableClose ? undefined : close}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6">{dialog.title}</Typography>
        {!dialog.disableClose && (
          <IconButton size="small" onClick={close} aria-label="Close dialog">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <DialogContent sx={{ pt: 3 }}>
        <AppIdProvider value={{ appId: dialog.appId, apis: perAppApis }}>
          <PluginErrorBoundary appId={dialog.appId} slot="dialog">
            <Suspense fallback={null}>
              <AppDialogBody render={render} close={close} />
            </Suspense>
          </PluginErrorBoundary>
        </AppIdProvider>
      </DialogContent>
    </Dialog>
  )
}

export const AppDialogHost = (): ReactElement => {
  const dialogs = useAppDialogStore((state) => state.dialogs)

  return (
    <>
      {dialogs.map((dialog) => (
        <AppDialogEntry key={`${dialog.appId}::${dialog.id}`} dialog={dialog} />
      ))}
    </>
  )
}
