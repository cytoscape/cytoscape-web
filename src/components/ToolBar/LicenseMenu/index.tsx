import Button from '@mui/material/Button'
import { useRef, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { PrimeReactProvider } from 'primereact/api'
import { LicenseDialog } from './LicenseDialog'

export const LicenseMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const [open, setOpen] = useState<boolean>(false)
  const { label } = props

  const op = useRef(null)

  return (
    <PrimeReactProvider>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        onClick={() => {
          setOpen(true)
        }}
      >
        {label}
      </Button>
      <LicenseDialog open={open} setOpen={setOpen} />
    </PrimeReactProvider>
  )
}
