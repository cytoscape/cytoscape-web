import { MenuItem } from 'primereact/menuitem'
import { useState } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { DropdownMenu } from '../DropdownMenu'
import { CreateEdgeMenuItem } from './CreateEdgeMenuItem'
import { CreateNodeMenuItem } from './CreateNodeMenuItem'
import { DeleteSelectedEdgesMenuItem } from './DeleteSelectedEdgesMenuItem'
import { DeleteSelectedNodesMenuItem } from './DeleteSelectedNodesMenuItem'
import { RedoMenuItem } from './RedoMenuItem'
import { UndoMenuItem } from './UndoMenuItem'


export const EditMenu = () => {
  const [open, setOpen] = useState(false)

  const hasNoNetworks =
    useWorkspaceStore((state) => state.workspace.networkIds).length === 0

  const handleClose = (): void => {
    setOpen(false)
  }

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
  ]

  return (
    <DropdownMenu
      id="edit-menu"
      label="Edit"
      menuItems={menuItems}
      open={open}
      disabled={hasNoNetworks}
      disabledTooltip="Load or create a network first"
      onOpenChange={setOpen}
    />
  )
}
