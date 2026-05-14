import '../DataMenu/menuItem.css'

import { Divider } from '@mui/material'
import { useState } from 'react'

import { DropdownMenuProps } from '../DropdownMenuProps'
import { AboutCytoscapeWebMenuItem } from './AboutCytoscapeWebMenuItem'
import { BugReportMenuItem } from './BugReportMenuItem'
import { CitationMenuItem } from './CitationMenuItem'
import { CodeRepositoryMenuItem } from './CodeRepositoryMenuitem'
import { DeveloperMenuItem } from './DeveloperMenuItem'
import { ExportDatabaseMenuItem } from './ExportDatabaseMenuItem'
import { ImportDatabaseMenuItem } from './ImportDatabaseMenuItem'
import { TutorialMenuItem } from './TutorialMenuItem'
import { DropdownMenu } from '../DropdownMenu'

export const HelpMenu = (props: DropdownMenuProps): JSX.Element => {
  const { label } = props
  const [open, setOpen] = useState<boolean>(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const menuItems = [
    {
      label: 'About Cytoscape Web',
      template: <AboutCytoscapeWebMenuItem handleClose={handleClose} />,
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Tutorial',
      template: <TutorialMenuItem handleClose={handleClose} />,
    },
    {
      label: 'Developer',
      items: [
        {
          label: "Developer's Guide",
          template: <DeveloperMenuItem handleClose={handleClose} />,
        },
        {
          label: 'Export Database...',
          template: <ExportDatabaseMenuItem handleClose={handleClose} />,
        },
        {
          label: 'Import Database...',
          template: <ImportDatabaseMenuItem handleClose={handleClose} />,
        },
      ],
    },
    {
      label: 'Code Repository',
      template: <CodeRepositoryMenuItem handleClose={handleClose} />,
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Citation',
      template: <CitationMenuItem handleClose={handleClose} />,
    },
    {
      label: '',
      template: <Divider />,
    },
    {
      label: 'Bug Report',
      template: <BugReportMenuItem handleClose={handleClose} />,
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
