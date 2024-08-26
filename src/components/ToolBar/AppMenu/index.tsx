import { Button, Menu, Tooltip } from '@mui/material'
import { Suspense, useEffect, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { AppSettingsMenuItem } from './AppSettingsMenuItem'
import { useAppStore } from '../../../store/AppStore'
import { ComponentType, CyApp } from '../../../models'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import { AppStatus } from '../../../models/AppModel/AppStatus'

export const AppMenu = (props: DropdownMenuProps) => {
  // Actual CyApp objects
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const [menuItems, setMenuItems] = useState<any>([])
  const [menuIds, setMenuIds] = useState<Set<string>>(new Set())

  // ID set of Apps already processed
  const [appIds, setAppIds] = useState<Set<string>>(new Set())

  const [Menu1, setAppMenuItem] = useState<any>()
  const [ExampleMenu, setAppMenuItem2] = useState<any>()

  const [componentList, setComponentList] = useState<[string, string][]>([])

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
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

  return (
    <div>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpenDropdownMenu}
      >
        {label}
      </Button>
      <Menu
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
            return <MenuComponent key={index} />
          })}
        </Suspense>
        <AppSettingsMenuItem handleClose={handleClose} />
      </Menu>
    </div>
  )
}
