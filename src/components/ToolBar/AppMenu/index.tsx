import { Button, Menu, MenuItem } from '@mui/material'
import { LazyExoticComponent, Suspense, useEffect, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { AppSettingsMenuItem } from './AppSettingsMenuItem'
import { useAppStore } from '../../../store/AppStore'
import { ComponentType, CyApp } from '../../../models'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'

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

  const generateMenuItem = (apps: Record<string, CyApp>): any[] => {
    // Dynamically load and generate the menu items

    const componentList: any = []
    Object.keys(apps).map((appId: string) => {
      const app: CyApp = apps[appId]
      const { components } = app

      if (components !== undefined) {
        components.forEach((component: ComponentMetadata) => {
          const componentId: string = component.id
          if (!menuIds.has(componentId)) {
            // Dynamically load the React component from remote
            const MenuItemComponent = ExternalComponent(
              appId,
              './' + componentId,
            )
            // componentList.push(<MenuItemComponent />)
            setAppMenuItem(MenuItemComponent)
          }
        })
      }
    })

    return componentList
  }

  useEffect(() => {
    const componentList: [string, string][] = []
    // Extract component list from the apps
    Object.keys(apps).forEach((appId: string) => {
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

  useEffect(() => {
    // // Check the app is already processed or not
    // Object.keys(apps).forEach((appId: string) => {
    //   const app: CyApp = apps[appId]
    //   const { components } = app
    //   if (appIds.has(appId) === false && components !== undefined) {
    //     components.forEach((component: ComponentMetadata) => {
    //       const componentId: string = component.id
    //       if (!menuIds.has(componentId)) {
    //         // Dynamically load the React component from remote
    //         const MenuItemComponent: LazyExoticComponent<ComponentType<any>> =
    //           ExternalComponent(appId, './' + componentId)
    //         if (Menu1 === undefined) {
    //           setAppMenuItem(MenuItemComponent)
    //         } else {
    //           setAppMenuItem2(MenuItemComponent)
    //         }
    //         setMenuItems((prevMenuItems) => [
    //           ...prevMenuItems,
    //           MenuItemComponent,
    //         ])
    //         setMenuIds((prevMenuIds) => new Set([...prevMenuIds, componentId]))
    //       }
    //     })
    //   }
    //   setAppIds((prevAppIds) => {
    //     const newAppIds = new Set(prevAppIds)
    //     newAppIds.add(appId)
    //     return newAppIds
    //   })
    // })
    // const simpleMenu = apps['simpleMenu']
    // if (simpleMenu !== undefined) {
    //   const { componentNames } = simpleMenu
    //   if (componentNames !== undefined && componentNames.length > 0) {
    //     const Comp1 = ExternalComponent('simpleMenu', './' + componentNames[0])
    //     console.log('Comp1:', Comp1)
    //     setAppMenuItem(Comp1)
    //   }
    // }
  }, [])

  useEffect(() => {
    console.log('## MenuItem added', menuItems)
  }, [menuItems])

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
