import AppRegistrationIcon from '@mui/icons-material/AppRegistration'
import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import { buildPerAppApis } from '../../../app-api/core/perAppApis'
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
        // 'apps-menu' entries are plain data (label/tooltip/icon/onClick):
        // the host renders the row itself, so no app component — and no
        // AppIdProvider, error boundary or Suspense — ever sits inside the
        // shared dropdown. An app that needs real UI opens it from onClick
        // through apis.dialog / apis.resource.openModal, in its own layer.
        const resourceId = `${r.appId}::apps-menu::${r.id}`
        const perAppApis: AppContextApis = buildPerAppApis(r.appId)

        // `requires` (network/selection) and app-active state come from
        // getResourceVisibility — the same rule 'right-panel' uses.
        // `isEnabled` is an extra imperative snapshot. Both are taken at
        // menu-build time; see the `open` dependency below.
        const visibility = perAppApis.resource.getResourceVisibility(
          r.id,
          'apps-menu',
        )
        const visible = visibility.success ? visibility.data.visible : false
        let customEnabled = true
        if (typeof r.isEnabled === 'function') {
          try {
            customEnabled = r.isEnabled(perAppApis) === true
          } catch (e) {
            logApp.error(`[AppMenu]: isEnabled() threw for ${resourceId}`, e)
            customEnabled = false
          }
        }
        const disabled = !visible || !customEnabled

        const handleClick = (): void => {
          // Close the dropdown first — every built-in item does. Safe now
          // that onClick only kicks off work living in a separate render
          // tree, so closing the menu can never unmount it mid-run.
          handleClose()
          try {
            const result = r.onClick?.(perAppApis)
            if (result instanceof Promise) {
              result.catch((e: unknown) => {
                logApp.error(`[AppMenu]: onClick failed for ${resourceId}`, e)
              })
            }
          } catch (e) {
            logApp.error(`[AppMenu]: onClick threw for ${resourceId}`, e)
          }
        }

        return {
          template: (
            <DropdownMenuItem
              label={r.title ?? r.id}
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
    // `open` is a deliberate extra dependency: getResourceVisibility() and
    // isEnabled() are imperative snapshots, so rebuilding on every open
    // re-evaluates enablement each time the dropdown is shown (not
    // reactively while it is open — the same moment built-in menus decide).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open re-snapshots enablement
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
