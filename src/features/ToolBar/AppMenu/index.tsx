import AppRegistrationIcon from '@mui/icons-material/AppRegistration'
import { MenuItem } from 'primereact/menuitem'
import { useCallback, useEffect, useState } from 'react'

import { AppIdProvider } from '../../../app-api/AppIdContext'
import { CyWebApi } from '../../../app-api/core'
import { createContextMenuApi } from '../../../app-api/core/contextMenuApi'
import { createResourceApi } from '../../../app-api/core/resourceApi'
import { useAppResourceStore } from '../../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { appRegistry } from '../../../data/hooks/stores/useAppManager'
import { useServiceTaskRunner } from '../../../data/hooks/useServiceTaskRunner'
import { logApp } from '../../../debug'
import { ComponentType, CyApp } from '../../../models/AppModel'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import type { RegisteredAppResource } from '../../../models/AppModel/RegisteredAppResource'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { ServiceStatus } from '../../../models/AppModel/ServiceStatus'
import { AppSettingsDialog } from '../../AppManager/AppSettingsDialog'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { PluginErrorBoundary } from '../../AppManager/PluginErrorBoundary'
import { TaskStatusDialog } from '../../AppManager/TaskStatusDialog'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { DropdownMenu } from '../DropdownMenu'
import { createMenuItems } from './MenuFactory'

export const AppMenu = () => {
  const run = useServiceTaskRunner()

  const [open, setOpen] = useState<boolean>(false)
  const [isInitialClick, setIsInitialClick] = useState<boolean>(false)

  // Actual CyApp objects
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  // For the app settings dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  // For the task status dialog
  const [openTaskDialog, setOpenTaskDialog] = useState<boolean>(false)

  const [componentList, setComponentList] = useState<
    [string, ComponentMetadata][]
  >([])

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

  const handleRun = useCallback(
    async (url: string): Promise<void> => {
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
        logApp.error(`[${AppMenu.name}]: Failed to run the task: ${url}`, e)
      } finally {
        clearCurrentTask()
      }

      setOpenTaskDialog(false)
    },
    [run, clearCurrentTask],
  )

  const handleClose = useCallback((): void => {
    setOpen(false)
  }, [])

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

    const componentList: [string, ComponentMetadata][] = []
    // Extract component list from the apps
    activeIds.forEach((appId: string) => {
      const app: CyApp = apps[appId]
      const { components } = app
      if (components !== undefined) {
        components.forEach((component: ComponentMetadata) => {
          const componentType: string = component.type
          if (
            componentType === ComponentType.Menu &&
            app.status === AppStatus.Active
          ) {
            // Add menu only
            componentList.push([appId, component])
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
        icon: <AppRegistrationIcon />,
        style: { height: '2.5em' },
        command: () => handleOpenDialog(true),
      },
    ]
  }

  // Read runtime menu resources from AppResourceStore
  const runtimeResources = useAppResourceStore((state) => state.resources)

  const createAppMenu = useCallback((): MenuItem[] => {
    // 1. Collect runtime 'apps-menu' resources
    const runtimeMenuItems: MenuItem[] = runtimeResources
      .filter((r: RegisteredAppResource) => {
        if (r.slot !== 'apps-menu') return false
        if (apps[r.appId]?.status !== AppStatus.Active) return false
        return true
      })
      .map((r: RegisteredAppResource) => {
        const MenuComponent = r.component as React.ComponentType<any>
        const perAppApis = {
          ...CyWebApi,
          resource: createResourceApi(r.appId),
          contextMenu: createContextMenuApi(r.appId),
        }

        const wrapped = r.closeOnAction ? (
          <div
            key={`${r.appId}::apps-menu::${r.id}`}
            onClick={() => {
              queueMicrotask(() => handleClose())
            }}
          >
            <AppIdProvider value={{ appId: r.appId, apis: perAppApis }}>
              <PluginErrorBoundary
                appId={r.appId}
                slot="apps-menu"
                customFallback={r.errorFallback as any}
              >
                <MenuComponent handleClose={handleClose} />
              </PluginErrorBoundary>
            </AppIdProvider>
          </div>
        ) : (
          <AppIdProvider
            key={`${r.appId}::apps-menu::${r.id}`}
            value={{ appId: r.appId, apis: perAppApis }}
          >
            <PluginErrorBoundary
              appId={r.appId}
              slot="apps-menu"
              customFallback={r.errorFallback as any}
            >
              <MenuComponent handleClose={handleClose} />
            </PluginErrorBoundary>
          </AppIdProvider>
        )

        return { template: wrapped } as MenuItem
      })

    // Track runtime ids for deduplication
    const runtimeIds = new Set(
      runtimeResources
        .filter((r) => r.slot === 'apps-menu')
        .map((r) => `${r.appId}::apps-menu::${r.id}`),
    )

    // 2. Collect manifest menu items (legacy CyApp.components)
    const manifestMenuItems: MenuItem[] = componentList
      .filter(([appId, component]) => {
        const manifestId = `${appId}::apps-menu::${component.id}`
        return !runtimeIds.has(manifestId)
      })
      .map(([appId, component], index) => {
        const freshComponent = appRegistry
          .get(appId)
          ?.components?.find((c) => c.id === component.id)
        const MenuComponent: any =
          freshComponent?.component ??
          component.component ??
          ExternalComponent(appId, './' + component.id)
        const menuItem: MenuItem = {
          template: <MenuComponent key={index} handleClose={handleClose} />,
        }
        return menuItem
      })

    // 3. Merge: runtime first, then manifest
    return [...runtimeMenuItems, ...manifestMenuItems]
  }, [runtimeResources, apps, componentList, handleClose])

  useEffect(() => {
    const appMenuItems: MenuItem[] = createAppMenu()
    const menuModel: MenuItem[] = createMenuItems(serviceApps, handleRun)
    const divider: MenuItem[] =
      menuModel.length > 0 || appMenuItems.length > 0
        ? [{ separator: true }]
        : []
    setMenuModel([...appMenuItems, ...menuModel, ...divider, ...getBaseMenu()])
  }, [serviceApps, createAppMenu, handleRun])

  useEffect(() => {
    // Create base menu items
    setMenuModel(getBaseMenu())
    setOpen(false)
  }, [])

  // TODO test whether this behavior is still correct after refactoring (no more button click events)
  useEffect(() => {
    if (open && !isInitialClick) {
      setIsInitialClick(true)
      const appMenuItems: MenuItem[] = createAppMenu()
      const menuModel: MenuItem[] = createMenuItems(serviceApps, handleRun)
      setMenuModel([...appMenuItems, ...menuModel, ...getBaseMenu()])
    }
  }, [open, isInitialClick, serviceApps, createAppMenu, handleRun])

  return (
    <>
      <DropdownMenu
        id="apps-menu"
        label="Apps"
        menuItems={menuModel}
        open={open}
        onOpenChange={setOpen}
      />
      <AppSettingsDialog
        openDialog={openDialog}
        setOpenDialog={setOpenDialog}
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
