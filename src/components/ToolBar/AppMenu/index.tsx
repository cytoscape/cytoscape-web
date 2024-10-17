import { Button, Divider, Menu } from '@mui/material'
import { Suspense, useEffect, useRef, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { useAppStore } from '../../../store/AppStore'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { AppSettingsDialog } from '../../AppManager/AppSettingsDialog'
import { ComponentType, CyApp } from '../../../models/AppModel'
import { ServiceSettingsDialog } from '../../AppManager/ServiceSettingsDialog'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { TieredMenu } from 'primereact/tieredmenu'
import { createMenuItems } from './menu-factory'
import { MenuItem } from 'primereact/menuitem'
import { OverlayPanel } from 'primereact/overlaypanel'

export const AppMenu = (props: DropdownMenuProps) => {
  // Actual CyApp objects
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const [openServiceDialog, setOpenServiceDialog] = useState<boolean>(false)

  const [componentList, setComponentList] = useState<[string, string][]>([])

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

  const handleOpenServiceDialog = (isDialogOpen: boolean): void => {
    setAnchorEl(null)
    const menuRefCurrent = menuRef.current as any
    menuRefCurrent.hide()
    setOpenServiceDialog(isDialogOpen)
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
          if (componentType === ComponentType.Menu) {
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
        template: <Divider />,
      },
      {
        label: 'App Settings...',
        style: { height: '2.5em' },
        command: () => handleOpenDialog(true),
      },
      {
        label: 'External Service Settings...',
        style: { height: '2.5em' },
        command: () => handleOpenServiceDialog(true),
      },
    ]
  }

  useEffect(() => {
    const appMenuItems: MenuItem[] = createAppMenu()
    const menuModel: MenuItem[] = createMenuItems(serviceApps, handleClose)
    setMenuModel([...appMenuItems, ...menuModel, ...getBaseMenu()])
  }, [serviceApps, apps])

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

  return (
    <>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(e) => {
          if (menuRef.current === null) {
            return
          }
          const menuRefCurrent = menuRef.current as any
          menuRefCurrent.toggle(e)
        }}
      >
        {label}
      </Button>
      {/* <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': label,
        }}
      >
        <Suspense fallback={<div>Loading...</div>}>
          {componentList.map(([appId, componentId], index) => {
            const MenuComponent = ExternalComponent(appId, './' + componentId)
            return <MenuComponent key={index} handleClose={handleClose} />
          })}
        </Suspense>
      </Menu> */}
      <OverlayPanel ref={menuRef} unstyled>
        <TieredMenu style={{ width: 350 }} model={menuModel} />
      </OverlayPanel>
      <AppSettingsDialog
        openDialog={openDialog}
        setOpenDialog={setOpenDialog}
      />
      <ServiceSettingsDialog
        openDialog={openServiceDialog}
        setOpenDialog={setOpenServiceDialog}
      />
    </>
  )
}
