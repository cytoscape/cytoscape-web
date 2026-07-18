import { MenuItem } from 'primereact/menuitem'
import { useCallback, useState } from 'react'

import { RootMenu } from '../../../models/AppModel/RootMenu'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { CreateEdgeMenuItem } from './CreateEdgeMenuItem'
import { CreateNodeMenuItem } from './CreateNodeMenuItem'
import { DeleteSelectedEdgesMenuItem } from './DeleteSelectedEdgesMenuItem'
import { DeleteSelectedNodesMenuItem } from './DeleteSelectedNodesMenuItem'
import { RedoMenuItem } from './RedoMenuItem'
import { UndoMenuItem } from './UndoMenuItem'


export const EditMenu = () => {
  const [open, setOpen] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const onBeforeRun = useCallback((): void => {
    setOpen(false)
  }, [])

  // Service apps whose cyWebMenuItem.root resolves to the Edit menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Edit,
    onBeforeRun,
  )

  const menuItems: MenuItem[] = [
    {
      template: <CreateNodeMenuItem onClick={handleClose} />,
    },
    {
      template: <CreateEdgeMenuItem onClick={handleClose} />,
    },
    {
      template: <DeleteSelectedNodesMenuItem onClick={handleClose} />,
    },
    {
      template: <DeleteSelectedEdgesMenuItem onClick={handleClose} />,
    },
    {
      separator: true,
    },
    {
      template: <UndoMenuItem onClick={handleClose} />,
    },
    {
      template: <RedoMenuItem onClick={handleClose} />,
    },
    ...(serviceMenuItems.length > 0
      ? [{ separator: true }, ...serviceMenuItems]
      : []),
  ]

  return (
    <>
      <DropdownMenu
        id="edit-menu"
        label="Edit"
        menuItems={menuItems}
        open={open}
        onOpenChange={setOpen}
      />
      {dialogs}
    </>
  )
}
