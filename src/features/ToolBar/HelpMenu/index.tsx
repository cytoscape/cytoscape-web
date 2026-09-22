import CodeIcon from '@mui/icons-material/Code'
import { lazy, Suspense, useCallback, useState } from 'react'

import { RootMenu } from '../../../models/AppModel/RootMenu'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'
import { AboutCytoscapeWebMenuItem } from './AboutCytoscapeWebMenuItem'
import { AboutDialog } from './AboutDialog'
import { BugReportDialog } from './BugReportDialog'
import { BugReportMenuItem } from './BugReportMenuItem'
import { CitationDialog } from './CitationDialog'
import { CitationMenuItem } from './CitationMenuItem'
import { CodeRepositoryMenuItem } from './CodeRepositoryMenuitem'
import { DeveloperMenuItem } from './DeveloperMenuItem'
import { ExportDatabaseMenuItem } from './ExportDatabaseMenuItem'
import { ImportDatabaseMenuItem } from './ImportDatabaseMenuItem'
import { LicenseDialog } from './LicenseDialog'
import { LicenseMenuItem } from './LicenseMenuItem'
import { TakeATourMenuItem } from './TakeATourMenuItem'
import { TutorialMenuItem } from './TutorialMenuItem'

// Lazy: the import flow carries the dropzone and snapshot stack, which
// would otherwise ship with the eager toolbar chunk.
const ImportDatabaseSnapshotDialog = lazy(() =>
  import('./ImportDatabaseSnapshotDialog').then((m) => ({
    default: m.ImportDatabaseSnapshotDialog,
  })),
)

/**
 * The Help menu's dialogs, one open at a time. They are owned here rather
 * than by their menu rows: a row is unmounted with the menu, and the menu
 * closes as soon as the dialog takes focus.
 */
type HelpDialog =
  | 'about'
  | 'license'
  | 'citation'
  | 'bug-report'
  | 'import-database'

export const HelpMenu = () => {
  const { open, setOpen } = useMenuBarMenu('help-menu')
  const [openDialog, setOpenDialog] = useState<HelpDialog | null>(null)
  // Mount latch for the lazy import flow: stays true after the first open
  // so the close animation still plays and reopening is instant.
  const [hasOpenedImport, setHasOpenedImport] = useState(false)

  const handleClose = (): void => {
    setOpen(false)
  }

  // Close the menu first, then show the dialog on its own.
  const openDialogFromMenu = (dialog: HelpDialog): (() => void) => {
    return () => {
      handleClose()
      if (dialog === 'import-database') {
        setHasOpenedImport(true)
      }
      setOpenDialog(dialog)
    }
  }
  const handleCloseDialog = (): void => {
    setOpenDialog(null)
  }

  const closeMenu = useCallback((): void => {
    setOpen(false)
  }, [setOpen])

  // Service apps whose cyWebMenuItem.root resolves to the Help menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Help,
    closeMenu,
  )

  const menuItems = [
    {
      template: (
        <AboutCytoscapeWebMenuItem onClick={openDialogFromMenu('about')} />
      ),
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
        {
          separator: true,
        },
        {
          template: <ExportDatabaseMenuItem onClick={handleClose} />,
        },
        {
          template: (
            <ImportDatabaseMenuItem
              onClick={openDialogFromMenu('import-database')}
            />
          ),
        },
      ],
    },
    {
      template: <LicenseMenuItem onClick={openDialogFromMenu('license')} />,
    },
    {
      separator: true,
    },
    {
      template: <CitationMenuItem onClick={openDialogFromMenu('citation')} />,
    },
    {
      separator: true,
    },
    {
      template: (
        <BugReportMenuItem onClick={openDialogFromMenu('bug-report')} />
      ),
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
      <AboutDialog open={openDialog === 'about'} onClose={handleCloseDialog} />
      <LicenseDialog
        open={openDialog === 'license'}
        onClose={handleCloseDialog}
      />
      <CitationDialog
        open={openDialog === 'citation'}
        onClose={handleCloseDialog}
      />
      <BugReportDialog
        open={openDialog === 'bug-report'}
        onClose={handleCloseDialog}
      />
      {hasOpenedImport && (
        <Suspense fallback={null}>
          <ImportDatabaseSnapshotDialog
            open={openDialog === 'import-database'}
            onClose={handleCloseDialog}
          />
        </Suspense>
      )}
      {dialogs}
    </>
  )
}
