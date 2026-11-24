import AppRegistrationIcon from '@mui/icons-material/AppRegistration'
import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'
import { useCallback, useMemo, useState } from 'react'

import { buildPerAppApis } from '../../../app-api/core/perAppApis'
import type { AppContextApis } from '../../../app-api/types/AppContext'
import { useAppResourceStore } from '../../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { logApp } from '../../../debug'
import { CyApp } from '../../../models/AppModel'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import type { RegisteredAppResource } from '../../../models/AppModel/RegisteredAppResource'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { AppSettingsDialog } from '../../AppManager/AppSettingsDialog'
import { DropdownMenu, DropdownMenuItem } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'
import { MenuItemIcon } from './MenuItemIcon'
import { useServiceAppMenu } from './useServiceAppMenu'
import { catalogAppId, trackEvent } from '@/data/analytics/trackEvent'

export const AppMenu = () => {
  const { open, setOpen } = useMenuBarMenu('apps-menu')

  // Actual CyApp objects
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  // For the app settings dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false)

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

  // Read runtime menu resources from AppResourceStore
  const runtimeResources = useAppResourceStore((state) => state.resources)

  const createAppMenu = useCallback((): MenuItem[] => {
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

        // A show/hide toggle (#1015): `isChecked` is snapshotted here, with
        // `isEnabled`. A throw shows the row unchecked — still a toggle, so
        // its role stays menuitemcheckbox. Disabled and checked combine.
        let checked: boolean | undefined
        if (typeof r.isChecked === 'function') {
          try {
            checked = r.isChecked(perAppApis) === true
          } catch (e) {
            logApp.error(`[AppMenu]: isChecked() threw for ${resourceId}`, e)
            checked = false
          }
        }

        // A function tooltip is resolved at the same moment. Anything but a
        // string is logged and dropped rather than rendered.
        let tooltip: string | undefined
        if (typeof r.tooltip === 'function') {
          try {
            const value: unknown = r.tooltip(perAppApis)
            if (typeof value === 'string') {
              tooltip = value
            } else {
              logApp.error(
                `[AppMenu]: tooltip() returned ${value === null ? 'null' : typeof value} for ${resourceId}, expected a string`,
              )
            }
          } catch (e) {
            logApp.error(`[AppMenu]: tooltip() threw for ${resourceId}`, e)
          }
        } else {
          tooltip = r.tooltip
        }

        const handleClick = (): void => {
          // Close the dropdown first — every built-in item does. Safe now
          // that onClick only kicks off work living in a separate render
          // tree, so closing the menu can never unmount it mid-run.
          handleClose()
          trackEvent('app_run', {
            app_type: 'plugin',
            app_id: catalogAppId(r.appId),
          })
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

        const label = r.title ?? r.id
        const dataTestId = `apps-menu-item-${r.appId}-${r.id}`
        // The wrapper row owns role/aria-checked; the template draws the
        // checkmark. A toggle has no icon (registration rejects one).
        return {
          checked,
          template:
            checked === undefined ? (
              <DropdownMenuItem
                label={label}
                tooltip={tooltip}
                icon={<MenuItemIcon icon={r.icon} />}
                disabled={disabled}
                onClick={handleClick}
                dataTestId={dataTestId}
              />
            ) : (
              <DropdownMenuItem
                label={label}
                tooltip={tooltip}
                checked={checked}
                disabled={disabled}
                onClick={handleClick}
                dataTestId={dataTestId}
              />
            ),
        } as MenuItem
      })

    return runtimeMenuItems
    // `open` is a deliberate extra dependency: getResourceVisibility(),
    // isEnabled(), isChecked() and a function tooltip are imperative snapshots, so rebuilding on every open
    // re-evaluates enablement each time the dropdown is shown (not
    // reactively while it is open — the same moment built-in menus decide).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open re-snapshots enablement
  }, [runtimeResources, apps, handleClose, open])

  /**
   * Menu model for the nested menu: app menu items, then service-app
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
