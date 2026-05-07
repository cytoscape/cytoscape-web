import { useState } from 'react'

import { DropdownMenu } from '../DropdownMenu'
import { MergeNetwork } from './MergeNetwork'


export const ToolsMenu = () => {
  const [open, setOpen] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const menuItems = [
    {
      label: 'Merge Networks',
      template: <MergeNetwork onClick={handleClose} />,
    },
  ]

  return (
    <DropdownMenu
      id="tools-menu"
      label="Tools"
      menuItems={menuItems}
      open={open}
      onOpenChange={setOpen}
    />
  )
}
