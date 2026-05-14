import { useState } from 'react'

import {
  LLMQueryOptionsMenuItem,
  RunLLMQueryMenuItem,
} from '../../LLMQuery/components'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { DropdownMenu } from '../DropdownMenu'

export const AnalysisMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const { label } = props
  const [open, setOpen] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const menuItems = [
    {
      label: 'Run LLM Query',
      template: <RunLLMQueryMenuItem handleClose={handleClose} />,
    },
    {
      label: 'LLM Query Options',
      template: <LLMQueryOptionsMenuItem handleClose={handleClose} />,
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
