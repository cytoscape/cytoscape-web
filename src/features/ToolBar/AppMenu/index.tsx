import { Divider } from '@mui/material'
import { MenuItem } from 'primereact/menuitem'
import { useEffect, useState } from 'react'

import { logApp } from '../../../debug'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { useServiceTaskRunner } from '../../../data/hooks/useServiceTaskRunner'
import { ComponentType, CyApp } from '../../../models/AppModel'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { ServiceStatus } from '../../../models/AppModel/ServiceStatus'
import { AppSettingsDialog } from '../../AppManager/AppSettingsDialog'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { TaskStatusDialog } from '../../AppManager/TaskStatusDialog'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { createMenuItems } from './MenuFactory'
import { DropdownMenu } from '../DropdownMenu'

export const AppMenu = (props: DropdownMenuProps) => {
  const run = useServiceTaskRunner()

  const [open, setOpen] = useState<boolean>(false)
  const [isInitialClick, setIsInitialClick] = useState<boolean>(false)

  // Actual CyApp objects
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const [appStateUpdated, setAppStateUpdated] = useState<boolean>(false)

  const { label } = props

  // For the app settings dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  // For the task status dialog
  const [openTaskDialog, setOpenTaskDialog] = useState<boolean>(false)

  const [componentList, setComponentList] = useState<[string, string][]>([])

  // For the notification dialog
  const [notificationDialog, setNotificationDialog] = useState<boolean>(false)
  const [notificationMessage, setNotificationMessage] = useState<string>('')

  // Clear the current task status
  const clearCurrentTask = useAppStore((state) => state.clearCurrentTask)

  /**
   * Menu model for the nested menu
   */
  const [menuModel, setMenuModel] = useState<MenuItem[]>([])

  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const handleOpenDialog = (isDialogOpen: boolean): void => {
    setOpen(false)
    setOpenDialog(isDialogOpen)
  }

  const handleRun = async (url: string): Promise<void> => {
    setOpen(false)

    // Now run the task
    setOpenTaskDialog(true)
    try {
      const result = await run(url)
      if (result.status !== ServiceStatus.Complete) {
        setNotificationDialog(true)
        setNotificationMessage(result.message)
      }
    } catch (e) {
      setNotificationDialog(true)
      setNotificationMessage(e.message)
      logApp.error(
        `[${AppMenu.name}]:[${handleRun.name}]: Failed to run the task: ${url}`,
        e,
      )
    } finally {
      clearCurrentTask()
    }

    setOpenTaskDialog(false)
  }

  const handleClose = (): void => {
    setOpen(false)
  }

  useEffect(() => {
    // Filter and use only active apps
    const appIds: string[] = Object.keys(apps)

    const activeIds = appIds.filter(
      (id) => apps[id].status === AppStatus.Active,
    )
    if (activeIds.length === 0) {
      setComponentList([])
      return
    }

    const componentList: [string, string][] = []
    // Extract component list from the apps
    activeIds.forEach((appId: string) => {
      const app: CyApp = apps[appId]
      const { components } = app
      if (components !== undefined) {
        components.forEach((component: ComponentMetadata) => {
          const componentId: string = component.id
          const componentType: string = component.type
          if (
            componentType === ComponentType.Menu &&
            app.status === AppStatus.Active
          ) {
            // Add menu only
            componentList.push([appId, componentId])
          }
        })
      }
    })

    setComponentList(componentList)
  }, [apps])

  const getBaseMenu = (): MenuItem[] => {
    return [
      {
        label: 'Manage Apps...',
        style: { height: '2.5em' },
        command: () => handleOpenDialog(true),
      },
    ]
  }

  useEffect(() => {
    const appMenuItems: MenuItem[] = createAppMenu()
    const menuModel: MenuItem[] = createMenuItems(serviceApps, handleRun)
    const divider: MenuItem[] =
      menuModel.length > 0 || appMenuItems.length > 0
        ? [{ template: <Divider /> }]
        : []
    setMenuModel([...appMenuItems, ...menuModel, ...divider, ...getBaseMenu()])
  }, [serviceApps, apps])

  useEffect(() => {
    const appMenuItems: MenuItem[] = createAppMenu()
    const menuModel: MenuItem[] = createMenuItems(serviceApps, handleRun)
    setMenuModel([...appMenuItems, ...menuModel, ...getBaseMenu()])
    setAppStateUpdated(false)
  }, [appStateUpdated])

  useEffect(() => {
    // Create base menu items
    setMenuModel(getBaseMenu())
    setOpen(false)
  }, [])

  const createAppMenu = (): MenuItem[] => {
    const appMenuItems: MenuItem[] = componentList.map(
      ([appId, componentId], index) => {
        const MenuComponent = ExternalComponent(appId, './' + componentId)
        const menuItem: MenuItem = {
          template: <MenuComponent key={index} handleClose={handleClose} />,
        }
        return menuItem
      },
    )

    return appMenuItems
  }

  // TODO test whether this behavior is still correct after refactoring (no more button click events)
  useEffect(() => {
    if (open && !isInitialClick) {
      setIsInitialClick(true)
      const appMenuItems: MenuItem[] = createAppMenu()
      const menuModel: MenuItem[] = createMenuItems(serviceApps, handleRun)
      setMenuModel([...appMenuItems, ...menuModel, ...getBaseMenu()])
    }
  }, [open])

  return (
    <>
      <DropdownMenu
        id={label}
        label={label}
        menuItems={menuModel}
        open={open}
        onOpenChange={setOpen}
      />
      <AppSettingsDialog
        openDialog={openDialog}
        setOpenDialog={setOpenDialog}
        setAppStateUpdated={setAppStateUpdated}
      />
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
}
