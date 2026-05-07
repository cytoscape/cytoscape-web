import { MenuItem } from 'primereact/menuitem'
import { useState } from 'react'

import {
  LLMQueryOptionsMenuItem,
  RunLLMQueryMenuItem,
} from '../../LLMQuery/components'
import { DropdownMenu } from '../DropdownMenu'


export const AnalysisMenu = () => {
  const [open, setOpen] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const menuItems: MenuItem[] = [
    {
      template: <RunLLMQueryMenuItem onClick={handleClose} />,
    },
    {
      separator: true,
    },
    {
      template: <LLMQueryOptionsMenuItem onClick={handleClose} />,
    },
  ]

  return (
    <DropdownMenu
      id="analysis-menu"
      label="Analysis"
      menuItems={menuItems}
      open={open}
      onOpenChange={setOpen}
    />
  )
}
