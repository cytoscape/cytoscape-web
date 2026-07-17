import { MenuItem } from 'primereact/menuitem'
import { useState } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import {
  LLMQueryOptionsDialog,
  LLMQueryOptionsMenuItem,
  RunLLMQueryMenuItem,
} from '../../LLMQuery/components'
import { DropdownMenu } from '../DropdownMenu'


export const AnalysisMenu = () => {
  const [open, setOpen] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)

  const hasNoNetworks =
    useWorkspaceStore((state) => state.workspace.networkIds).length === 0

  const handleClose = (): void => {
    setOpen(false)
  }

  const handleOpenDialog = (): void => {
    handleClose()
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
  }

  const menuItems: MenuItem[] = [
    {
      template: <RunLLMQueryMenuItem onClick={handleClose} />,
    },
    {
      separator: true,
    },
    {
      template: <LLMQueryOptionsMenuItem onClick={handleOpenDialog} />,
    },
  ]

  return (
    <>
      <DropdownMenu
        id="analysis-menu"
        label="Analysis"
        menuItems={menuItems}
        open={open}
        disabled={hasNoNetworks}
        disabledTooltip="Load or create a network first"
        onOpenChange={setOpen}
      />
      <LLMQueryOptionsDialog
        open={openDialog}
        handleClose={handleCloseDialog}
      />
    </>
  )
}
