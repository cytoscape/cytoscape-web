import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'

import { Divider } from '@mui/material'
import { useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { BugReportMenuItem } from './BugReportMenuItem'
import { CitationMenuItem } from './CitationMenuItem'
import { CodeRepositoryMenuItem } from './CodeRepositoryMenuitem'
import { TutorialMenuItem } from './TutorialMenuItem'
import { DeveloperMenuItem } from './DeveloperMenuItem'
import { AboutCytoscapeWebMenuItem } from './AboutCytoscapeWebMenuItem'

export const HelpMenu = (props: DropdownMenuProps): JSX.Element => {
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
        <AboutCytoscapeWebMenuItem handleClose={handleClose} />
        <Divider />
        <TutorialMenuItem handleClose={handleClose}   />
        <DeveloperMenuItem handleClose={handleClose} />
        <CodeRepositoryMenuItem handleClose={handleClose} />
        <Divider />
        <CitationMenuItem handleClose={handleClose} />
        <Divider />
        <BugReportMenuItem handleClose={handleClose} />
      </Menu>
    </div>
  )
}
