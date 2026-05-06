import { useState } from 'react'

import { DropdownMenuProps } from '../DropdownMenuProps'
import { MergeNetwork } from './MergeNetwork'
import { DropdownMenu } from '../DropdownMenu'

export const ToolsMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const { label } = props
  const [open, setOpen] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const menuItems = [
    {
      label: 'Merge Networks',
      template: <MergeNetwork handleClose={handleClose} />,
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
