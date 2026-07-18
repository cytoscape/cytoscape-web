import { useCallback, useState } from 'react'

import { RootMenu } from '../../../models/AppModel/RootMenu'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { MergeNetwork } from './MergeNetwork'


export const ToolsMenu = () => {
  const [open, setOpen] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const onBeforeRun = useCallback((): void => {
    setOpen(false)
  }, [])

  // Service apps whose cyWebMenuItem.root resolves to the Tools menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Tools,
    onBeforeRun,
  )

  const menuItems = [
    {
      label: 'Merge Networks',
      template: <MergeNetwork onClick={handleClose} />,
    },
    ...serviceMenuItems,
  ]

  return (
    <>
      <DropdownMenu
        id="tools-menu"
        label="Tools"
        menuItems={menuItems}
        open={open}
        onOpenChange={setOpen}
      />
      {dialogs}
    </>
  )
}
