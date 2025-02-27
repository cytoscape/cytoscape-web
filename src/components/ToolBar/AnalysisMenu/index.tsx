import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import { useRef, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'

import {
  LLMQueryOptionsMenuItem,
  RunLLMQueryMenuItem,
} from '../../../features/LLMQuery/components'
import { PrimeReactProvider } from 'primereact/api'
import { OverlayPanel } from 'primereact/overlaypanel'
import { TieredMenu } from 'primereact/tieredmenu'
import { Box } from '@mui/material'

export const AnalysisMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClose = (): void => {
    ;(op.current as any)?.hide()
    setAnchorEl(null)
  }

  const op = useRef(null)

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
    <PrimeReactProvider>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(e) => (op.current as any)?.toggle(e)}
      >
        <Box sx={{ fontSize: '0.875rem' }}>{label}</Box>
      </Button>
      <OverlayPanel ref={op} unstyled>
        <TieredMenu model={menuItems} />
      </OverlayPanel>
    </PrimeReactProvider>
  )
}
