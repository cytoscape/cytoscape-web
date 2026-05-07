import CodeIcon from '@mui/icons-material/Code'
import { useState } from 'react'

import { DropdownMenu } from '../DropdownMenu'
import { AboutCytoscapeWebMenuItem } from './AboutCytoscapeWebMenuItem'
import { BugReportMenuItem } from './BugReportMenuItem'
import { CitationMenuItem } from './CitationMenuItem'
import { CodeRepositoryMenuItem } from './CodeRepositoryMenuitem'
import { DeveloperMenuItem } from './DeveloperMenuItem'
import { ExportDatabaseMenuItem } from './ExportDatabaseMenuItem'
import { ImportDatabaseMenuItem } from './ImportDatabaseMenuItem'
import { LicenseDialog } from './LicenseDialog'
import { LicenseMenuItem } from './LicenseMenuItem'
import { TutorialMenuItem } from './TutorialMenuItem'


export const HelpMenu = () => {
  const [open, setOpen] = useState<boolean>(false)
  const [openLicenseDialog, setOpenLicenseDialog] = useState<boolean>(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  // License dialog handlers
  const handleOpenLicenseDialog = (): void => {
    handleClose()
    setOpenLicenseDialog(true)
  }
  const handleCloseLicenseDialog = (): void => {
    setOpenLicenseDialog(false)
  }

  const menuItems = [
    {
      template: <AboutCytoscapeWebMenuItem onClick={handleClose} />,
    },
    {
      separator: true,
    },
    {
      template: <TutorialMenuItem onClick={handleClose} />,
    },
    {
      label: 'Developer',
      icon: <CodeIcon sx={{mr: 1}} />,
      items: [
        {
          template: <DeveloperMenuItem onClick={handleClose} />,
        },
        {
          template: <CodeRepositoryMenuItem onClick={handleClose} />,
        },
        {
          separator: true,
        },
        {
          template: <ExportDatabaseMenuItem onClick={handleClose} />,
        },
        {
          template: <ImportDatabaseMenuItem onClick={handleClose} />,
        },
      ],
    },
    {
      template: <LicenseMenuItem onClick={handleOpenLicenseDialog} />,
    },
    {
      separator: true,
    },
    {
      template: <CitationMenuItem onClick={handleClose} />,
    },
    {
      separator: true,
    },
    {
      template: <BugReportMenuItem onClick={handleClose} />,
    },
  ]

  return (
    <>
      <DropdownMenu
        id="help-menu"
        label="Help"
        menuItems={menuItems}
        open={open}
        minWidth={300}
        onOpenChange={setOpen}
      />
      <LicenseDialog open={openLicenseDialog} onClose={handleCloseLicenseDialog} />
    </>
  )
}
