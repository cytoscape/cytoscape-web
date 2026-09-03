import AppRegistrationIcon from '@mui/icons-material/AppRegistration'
import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import { AppIdProvider } from '../../../app-api/AppIdContext'
import { buildPerAppApis } from '../../../app-api/core/perAppApis'
import { useAppResourceStore } from '../../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { appRegistry } from '../../../data/hooks/stores/useAppManager'
import { ComponentType, CyApp } from '../../../models/AppModel'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import type { RegisteredAppResource } from '../../../models/AppModel/RegisteredAppResource'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { AppSettingsDialog } from '../../AppManager/AppSettingsDialog'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { PluginErrorBoundary } from '../../AppManager/PluginErrorBoundary'
import { DropdownMenu } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'
import { useServiceAppMenu } from './useServiceAppMenu'

export const AppMenu = () => {
  const { open, setOpen } = useMenuBarMenu('apps-menu')

  // Actual CyApp objects
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  // For the app settings dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const [componentList, setComponentList] = useState<
    [string, ComponentMetadata][]
  >([])

  const handleClose = useCallback((): void => {
    setOpen(false)
  }, [setOpen])

  // Service apps whose cyWebMenuItem.root resolves to the Apps menu (this also
  // catches apps with a missing or unsupported root, which fall back here).
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Apps,
    handleClose,
  )

  const handleOpenDialog = (isDialogOpen: boolean): void => {
    setOpen(false)
    setOpenDialog(isDialogOpen)
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
        const perAppApis = buildPerAppApis(r.appId)

        // Local Suspense is required: registered components may be
        // React.lazy(), and without a boundary here the first open would
        // suspend all the way up to the app-level boundary, hiding the whole
        // shell behind the boot screen — which also corrupts allotment's
        // split-view state in the workspace editor (see
        // useRemountKeyOnReveal).
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
                <Suspense fallback={null}>
                  <MenuComponent handleClose={handleClose} />
                </Suspense>
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
              <Suspense fallback={null}>
                <MenuComponent handleClose={handleClose} />
              </Suspense>
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
        // ExternalComponent returns a React.lazy() — the same missing-boundary
        // hazard as the runtime branch above, and the branch that suspended the
        // whole shell in practice (manifest menu chunks load on first open).
        const menuItem: MenuItem = {
          template: (
            <Suspense key={index} fallback={null}>
              <MenuComponent handleClose={handleClose} />
            </Suspense>
          ),
        }
        return menuItem
      })

    // 3. Merge: runtime first, then manifest
    return [...runtimeMenuItems, ...manifestMenuItems]
  }, [runtimeResources, apps, componentList, handleClose])

  /**
   * Menu model for the nested menu: legacy app menu items, then service-app
   * items routed to the Apps menu, a divider, then the base "Manage Apps" item.
   */
  const menuModel: MenuItem[] = useMemo(() => {
    const appMenuItems: MenuItem[] = createAppMenu()
    const baseMenu: MenuItem[] = [
      {
        label: 'Manage Apps...',
        icon: <AppRegistrationIcon />,
        style: { height: '2.5em' },
        command: () => handleOpenDialog(true),
      },
    ]
    const divider: MenuItem[] =
      serviceMenuItems.length > 0 || appMenuItems.length > 0
        ? [{ separator: true }]
        : []
    return [...appMenuItems, ...serviceMenuItems, ...divider, ...baseMenu]
    // handleOpenDialog only touches stable state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createAppMenu, serviceMenuItems])

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
      {dialogs}
    </>
  )
}
