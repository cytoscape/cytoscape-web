import Button from '@mui/material/Button'
import { useRef, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { MergeNetwork } from './MergeNetwork'
import { PrimeReactProvider } from 'primereact/api'
import { OverlayPanel } from 'primereact/overlaypanel'
import { TieredMenu } from 'primereact/tieredmenu'

export const ToolsMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const op = useRef(null)

  const menuItems = [
    {
      label: 'Merge Networks',
      template: <MergeNetwork handleClose={handleClose} />,
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
        {label}
      </Button>
      <OverlayPanel ref={op} unstyled>
        <TieredMenu model={menuItems} />
      </OverlayPanel>
    </PrimeReactProvider>
  )
}
