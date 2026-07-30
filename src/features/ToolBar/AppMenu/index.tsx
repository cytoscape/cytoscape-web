import AppRegistrationIcon from '@mui/icons-material/AppRegistration'
import { MenuItem } from 'primereact/menuitem'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { CyWebApi } from '../../../app-api/core'
import { createContextMenuApi } from '../../../app-api/core/contextMenuApi'
import { createDialogApi } from '../../../app-api/core/dialogApi'
import { createResourceApi } from '../../../app-api/core/resourceApi'
import type { AppContextApis } from '../../../app-api/types/AppContext'
import { useAppResourceStore } from '../../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { appRegistry } from '../../../data/hooks/stores/useAppManager'
import { logApp } from '../../../debug'
import { ComponentType, CyApp } from '../../../models/AppModel'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import type { RegisteredAppResource } from '../../../models/AppModel/RegisteredAppResource'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { AppSettingsDialog } from '../../AppManager/AppSettingsDialog'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { DropdownMenu, DropdownMenuItem } from '../DropdownMenu'
import { MenuItemIcon } from './MenuItemIcon'
import { useServiceAppMenu } from './useServiceAppMenu'

export const AppMenu = () => {
  const [open, setOpen] = useState<boolean>(false)

  // Actual CyApp objects
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  // For the app settings dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const [componentList, setComponentList] = useState<
    [string, ComponentMetadata][]
  >([])

  const handleClose = useCallback((): void => {
    setOpen(false)
  }, [])

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
        const perAppApis: AppContextApis = {
          ...CyWebApi,
          resource: createResourceApi(r.appId),
          contextMenu: createContextMenuApi(r.appId),
          dialog: createDialogApi(r.appId),
        }

        // `requires` (network/selection/app-active) is evaluated reactively
        // from the host's own stores via getResourceVisibility — the same
        // logic 'right-panel' visibility already uses. `isEnabled` is an
        // extra imperative snapshot check, taken at menu-build time (see the
        // `open` dependency below).
        const visibility = createResourceApi(r.appId).getResourceVisibility(r.id)
        let customEnabled = true
        if (typeof r.isEnabled === 'function') {
          try {
            customEnabled = r.isEnabled(perAppApis)
          } catch (e) {
            logApp.error(
              `[AppMenu]: isEnabled() threw for ${r.appId}::apps-menu::${r.id}`,
              e,
            )
            customEnabled = false
          }
        }
        const disabled = !visibility.visible || !customEnabled

        const handleClick = (): void => {
          // Closes the dropdown immediately — matches every built-in menu
          // item (CreateNodeMenuItem, etc). Unlike the old component-based
          // registration, this is now always safe: onClick only kicks off
          // work (e.g. apis.dialog.open(...)) that lives in a separate
          // render tree, so closing the menu can never unmount it mid-run.
          handleClose()
          try {
            const result = r.onClick?.(perAppApis)
            if (result instanceof Promise) {
              result.catch((e) => {
                logApp.error(
                  `[AppMenu]: onClick failed for ${r.appId}::apps-menu::${r.id}`,
                  e,
                )
              })
            }
          } catch (e) {
            logApp.error(
              `[AppMenu]: onClick threw for ${r.appId}::apps-menu::${r.id}`,
              e,
            )
          }
        }

        return {
          template: (
            <DropdownMenuItem
              key={`${r.appId}::apps-menu::${r.id}`}
              label={r.label ?? r.id}
              tooltip={r.tooltip}
              icon={<MenuItemIcon icon={r.icon} />}
              disabled={disabled}
              onClick={handleClick}
              dataTestId={`apps-menu-item-${r.appId}-${r.id}`}
            />
          ),
        } as MenuItem
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
    // `open` is intentionally a dep, even though it's unused in the body:
    // isEnabled()/getResourceVisibility() are imperative snapshots, so
    // re-running this on every open re-evaluates enablement fresh each time
    // the dropdown is shown (checked at menu-build time, not reactively while the menu is open).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeResources, apps, componentList, handleClose, open])

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
