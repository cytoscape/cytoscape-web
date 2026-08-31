import CodeIcon from '@mui/icons-material/Code'
import { useCallback, useState } from 'react'

import { RootMenu } from '../../../models/AppModel/RootMenu'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { AboutCytoscapeWebMenuItem } from './AboutCytoscapeWebMenuItem'
import { BugReportMenuItem } from './BugReportMenuItem'
import { CitationMenuItem } from './CitationMenuItem'
import { CodeRepositoryMenuItem } from './CodeRepositoryMenuitem'
import { DeveloperMenuItem } from './DeveloperMenuItem'
import { LicenseDialog } from './LicenseDialog'
import { LicenseMenuItem } from './LicenseMenuItem'
import { TakeATourMenuItem } from './TakeATourMenuItem'
import { TutorialMenuItem } from './TutorialMenuItem'

export const HelpMenu = () => {
  const [open, setOpen] = useState<boolean>(false)
  const [openLicenseDialog, setOpenLicenseDialog] = useState<boolean>(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  const onBeforeRun = useCallback((): void => {
    setOpen(false)
  }, [])

  // Service apps whose cyWebMenuItem.root resolves to the Help menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Help,
    onBeforeRun,
  )

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
      template: <TakeATourMenuItem onClick={handleClose} />,
    },
    {
      template: <TutorialMenuItem onClick={handleClose} />,
    },
    {
      label: 'Developer',
      icon: <CodeIcon sx={{ mr: 1 }} />,
      items: [
        {
          template: <DeveloperMenuItem onClick={handleClose} />,
        },
        {
          template: <CodeRepositoryMenuItem onClick={handleClose} />,
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
    ...(serviceMenuItems.length > 0
      ? [{ separator: true }, ...serviceMenuItems]
      : []),
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
      <LicenseDialog
        open={openLicenseDialog}
        onClose={handleCloseLicenseDialog}
      />
      {dialogs}
    </>
  )
}
