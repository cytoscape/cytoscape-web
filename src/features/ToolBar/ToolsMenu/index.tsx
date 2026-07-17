import { useState } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { DropdownMenu } from '../DropdownMenu'
import { MergeNetwork } from './MergeNetwork'


export const ToolsMenu = () => {
  const [open, setOpen] = useState(false)

  const hasNoNetworks =
    useWorkspaceStore((state) => state.workspace.networkIds).length === 0

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
      disabled={hasNoNetworks}
      disabledTooltip="Load or create a network first"
      onOpenChange={setOpen}
    />
  )
}
