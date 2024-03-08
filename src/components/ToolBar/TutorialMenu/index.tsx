import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import { useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { TutorialMenuItemOne } from '../../../features/TutorialExampleOne/components'
import { TutorialMenuItemTwo } from '../../../features/TutorialExampleTwo/components'
import { TutorialMenuItemThree } from '../../../features/TutorialExampleThree/components'

export const TutorialMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  return (
    <div>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpenDropdownMenu}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': label,
        }}
      >
        <TutorialMenuItemOne handleClose={handleClose} />
        <TutorialMenuItemTwo handleClose={handleClose} />
        <TutorialMenuItemThree handleClose={handleClose} />
      </Menu>
    </div>
  )
}