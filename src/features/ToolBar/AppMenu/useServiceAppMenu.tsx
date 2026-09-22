import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'
import { ReactNode, useCallback, useMemo, useState } from 'react'

import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { useServiceTaskRunner } from '../../../data/hooks/useServiceTaskRunner'
import { logApp } from '../../../debug'
import { filterServiceAppsByRoot } from '../../../models/AppModel/impl'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { ServiceStatus } from '../../../models/AppModel/ServiceStatus'
import { TaskStatusDialog } from '../../AppManager/TaskStatusDialog'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { AppMenuItemDialog, createMenuItems } from './MenuFactory'

export interface ServiceAppMenu {
  // Menu items for the service apps that resolve to the requested root menu.
  menuItems: MenuItem[]
  // Task status + error dialogs that must be rendered by the host menu.
  dialogs: ReactNode
  // Runs the service app at the given url (exposed for testing/reuse).
  handleRun: (url: string) => Promise<void>
}

/**
 * Shared logic for hosting service-app menu items under a given top-level menu.
 *
 * Any top-level menu (Apps, Tools, ...) can call this hook with its own
 * RootMenu value to obtain the menu items for the service apps routed to it,
 * plus the dialogs those apps require. This keeps the run machinery (task
 * polling, error reporting) in one place instead of duplicating it in every
 * menu that can host a service app.
 *
 * The parameter dialog is owned here rather than by the menu row that opens
 * it. A row is unmounted the moment the menu closes, and the dialog went with
 * it (#745); at this level it outlives the menu.
 *
 * @param closeMenu Closes the host menu. Called when a row opens the parameter
 *   dialog, so no menu level is left painting over the form.
 */
export const useServiceAppMenu = (
  root: RootMenu,
  closeMenu?: () => void,
): ServiceAppMenu => {
  const run = useServiceTaskRunner()
  const clearCurrentTask = useAppStore((state) => state.clearCurrentTask)
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const [openTaskDialog, setOpenTaskDialog] = useState<boolean>(false)
  const [notificationDialog, setNotificationDialog] = useState<boolean>(false)
  const [notificationMessage, setNotificationMessage] = useState<string>('')
  // The app whose parameter dialog is open, or null for none.
  const [dialogApp, setDialogApp] = useState<ServiceApp | null>(null)

  const handleRun = useCallback(
    async (url: string): Promise<void> => {
      closeMenu?.()

      setOpenTaskDialog(true)
      try {
        const result = await run(url)
        if (result.status !== ServiceStatus.Complete) {
          setNotificationDialog(true)
          setNotificationMessage(result.message)
        }
      } catch (e) {
        setNotificationDialog(true)
        setNotificationMessage(e instanceof Error ? e.message : String(e))
        logApp.error(`[useServiceAppMenu]: Failed to run the task: ${url}`, e)
      } finally {
        clearCurrentTask()
      }

      setOpenTaskDialog(false)
    },
    [run, clearCurrentTask, closeMenu],
  )

  const openAppDialog = useCallback(
    (app: ServiceApp): void => {
      closeMenu?.()
      setDialogApp(app)
    },
    [closeMenu],
  )

  const closeAppDialog = useCallback((): void => setDialogApp(null), [])

  const runDialogApp = useCallback(async (): Promise<void> => {
    if (dialogApp === null) {
      return
    }
    await handleRun(dialogApp.url)
    logApp.info(`[useServiceAppMenu]: Task finished for url: ${dialogApp.url}`)
  }, [dialogApp, handleRun])

  const appsForRoot = useMemo(
    () => filterServiceAppsByRoot(serviceApps, root),
    [serviceApps, root],
  )

  const menuItems = useMemo(
    () => createMenuItems(appsForRoot, openAppDialog),
    [appsForRoot, openAppDialog],
  )

  const dialogs = (
    <>
      <TaskStatusDialog open={openTaskDialog} setOpen={setOpenTaskDialog} />
      <ConfirmationDialog
        open={notificationDialog}
        setOpen={setNotificationDialog}
        title="Oops! Something went wrong..."
        onConfirm={() => {}}
        message={`Error message from service: ${notificationMessage}`}
      />
      {dialogApp !== null ? (
        <AppMenuItemDialog
          open={true}
          app={dialogApp}
          handleClose={closeAppDialog}
          handleConfirm={runDialogApp}
        />
      ) : null}
    </>
  )

  return { menuItems, dialogs, handleRun }
}
