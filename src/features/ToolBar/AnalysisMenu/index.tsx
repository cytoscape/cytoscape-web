import { MenuItem } from 'primereact/menuitem'
import { useState } from 'react'

import {
  LLMQueryOptionsDialog,
  LLMQueryOptionsMenuItem,
  RunLLMQueryMenuItem,
} from '../../LLMQuery/components'
import { DropdownMenu } from '../DropdownMenu'


export const AnalysisMenu = () => {
  const [open, setOpen] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)

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
        onOpenChange={setOpen}
      />
      <LLMQueryOptionsDialog
        open={openDialog}
        handleClose={handleCloseDialog}
      />
    </>
  )
}
