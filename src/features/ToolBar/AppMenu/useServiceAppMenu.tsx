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
import { createMenuItems } from './MenuFactory'

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
 * plus the task/notification dialogs those runs require. This keeps the run
 * machinery (task polling, error reporting) in one place instead of duplicating
 * it in every menu that can host a service app.
 */
export const useServiceAppMenu = (
  root: RootMenu,
  onBeforeRun?: () => void,
): ServiceAppMenu => {
  const run = useServiceTaskRunner()
  const clearCurrentTask = useAppStore((state) => state.clearCurrentTask)
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const [openTaskDialog, setOpenTaskDialog] = useState<boolean>(false)
  const [notificationDialog, setNotificationDialog] = useState<boolean>(false)
  const [notificationMessage, setNotificationMessage] = useState<string>('')

  const handleRun = useCallback(
    async (url: string): Promise<void> => {
      onBeforeRun?.()

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
        logApp.error(
          `[useServiceAppMenu]: Failed to run the task: ${url}`,
          e,
        )
      } finally {
        clearCurrentTask()
      }

      setOpenTaskDialog(false)
    },
    [run, clearCurrentTask, onBeforeRun],
  )

  const appsForRoot = useMemo(
    () => filterServiceAppsByRoot(serviceApps, root),
    [serviceApps, root],
  )

  const menuItems = useMemo(
    () => createMenuItems(appsForRoot, handleRun),
    [appsForRoot, handleRun],
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
    </>
  )

  return { menuItems, dialogs, handleRun }
}
