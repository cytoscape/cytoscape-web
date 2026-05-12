import { useState } from 'react'

import { DropdownMenuProps } from '../DropdownMenuProps'
import { CreateEdgeMenuItem } from './CreateEdgeMenuItem'
import { CreateNodeMenuItem } from './CreateNodeMenuItem'
import { DeleteSelectedEdgesMenuItem } from './DeleteSelectedEdgesMenuItem'
import { DeleteSelectedNodesMenuItem } from './DeleteSelectedNodesMenuItem'
import { RedoMenuItem } from './RedoMenuItem'
import { UndoMenuItem } from './UndoMenuItem'
import { DropdownMenu } from '../DropdownMenu'
import { Divider } from '@mui/material'

export const EditMenu = (props: DropdownMenuProps): JSX.Element => {
  const { label } = props
  const [open, setOpen] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const menuItems = [
    {
      template: <CreateNodeMenuItem handleClose={handleClose} />,
    },
    {
      template: <CreateEdgeMenuItem handleClose={handleClose} />,
    },
    {
      template: <DeleteSelectedNodesMenuItem handleClose={handleClose} />,
    },
    {
      template: <DeleteSelectedEdgesMenuItem handleClose={handleClose} />,
    },
    {
      template: <Divider />,
    },
    {
      template: <UndoMenuItem handleClose={handleClose} />,
    },
    {
      template: <RedoMenuItem handleClose={handleClose} />,
    },
  ]

  return (
    <DropdownMenu
      id={label}
      label={label}
      menuItems={menuItems}
      open={open}
      onOpenChange={setOpen}
    />
  )
}
