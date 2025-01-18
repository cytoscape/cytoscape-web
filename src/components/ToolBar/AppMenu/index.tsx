import { Button, Divider, useTheme } from '@mui/material'
import { useContext, useEffect, useRef, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { useAppStore } from '../../../store/AppStore'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { AppSettingsDialog } from '../../AppManager/AppSettingsDialog'
import { ComponentType, CyApp } from '../../../models/AppModel'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { TieredMenu } from 'primereact/tieredmenu'
import { createMenuItems } from './menu-factory'
import { MenuItem } from 'primereact/menuitem'
import { OverlayPanel } from 'primereact/overlaypanel'
import { useServiceTaskRunner } from '../../../store/hooks/useServiceTaskRunner'
import { TaskStatusDialog } from '../../Util/TaskStatusDialog'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'
import { ServiceStatus } from '../../../models/AppModel/ServiceStatus'
import { AppConfig, AppConfigContext } from '../../../AppConfigContext'

export const AppMenu = (props: DropdownMenuProps) => {
  const theme = useTheme()

  const run = useServiceTaskRunner()

  const [isInitialClick, setIsInitialClick] = useState<boolean>(false)

  // Actual CyApp objects
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const [appStateUpdated, setAppStateUpdated] = useState<boolean>(false)

  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

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

  const { defaultServices } = useContext<AppConfig>(AppConfigContext)

  /**
   * Menu model for the nested menu
   */
  const [menuModel, setMenuModel] = useState<MenuItem[]>([])

  const menuRef = useRef(null)

  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const handleOpenDialog = (isDialogOpen: boolean): void => {
    setAnchorEl(null)
    const menuRefCurrent = menuRef.current as any
    menuRefCurrent.hide()
    setOpenDialog(isDialogOpen)
  }

  const handleRun = async (url: string): Promise<void> => {
    setAnchorEl(null)
    const menuRefCurrent = menuRef.current as any
    menuRefCurrent.hide()

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
      console.error(`Failed to run the task:`, e)
    } finally {
      clearCurrentTask()
    }

    setOpenTaskDialog(false)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
    const menuRefCurrent = menuRef.current as any
    menuRefCurrent.hide()
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
    const menuRefCurrent = menuRef.current as any
    menuRefCurrent.hide()
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

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (menuRef.current === null) {
      return
    }
    if (!isInitialClick) {
      setIsInitialClick(true)
      const appMenuItems: MenuItem[] = createAppMenu()
      const menuModel: MenuItem[] = createMenuItems(serviceApps, handleRun)
      setMenuModel([...appMenuItems, ...menuModel, ...getBaseMenu()])
    }

    const menuRefCurrent = menuRef.current as any
    menuRefCurrent.toggle(e)
  }

  return (
    <>
      <Button
        sx={{
          color: theme.palette.common.white,
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(e) => {
          handleClick(e)
        }}
      >
        {label}
      </Button>
      <OverlayPanel ref={menuRef} unstyled>
        <TieredMenu style={{ width: 350 }} model={menuModel} />
      </OverlayPanel>
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
