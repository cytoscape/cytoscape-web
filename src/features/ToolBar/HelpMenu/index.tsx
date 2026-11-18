import CodeIcon from '@mui/icons-material/Code'
import { lazy, Suspense, useCallback, useState } from 'react'

import { useClearLocalCache } from '@/data/hooks/useClearLocalCache'
import { ConfirmationDialog } from '@/features/ConfirmationDialog'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { LazyDialogBoundary } from '@/features/LazyDialogBoundary'
import { appendServiceMenuItems } from '../AppMenu/appendServiceMenuItems'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenu } from '../DropdownMenu'
import { useMenuBarMenu } from '../MenuBar'
import { AboutCytoscapeWebMenuItem } from './AboutCytoscapeWebMenuItem'
import { AboutDialog } from './AboutDialog'
import { BugReportDialog } from './BugReportDialog'
import { BugReportMenuItem } from './BugReportMenuItem'
import { CitationDialog } from './CitationDialog'
import { CitationMenuItem } from './CitationMenuItem'
import { ClearLocalCacheMenuItem } from './ClearLocalCacheMenuItem'
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
  | 'clear-local-cache'

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

  // Clear Local Cache. Success reloads inside the hook. A failure has closed
  // this tab's database connections, so nothing it does from here would be
  // saved: report it, then reload so a retry starts clean. `alert()` because
  // the dialog has already closed and the menu has nowhere to render it.
  const { clear: clearCache, reload } = useClearLocalCache()
  const handleClearLocalCache = (): void => {
    void clearCache().then((result) => {
      if (result.status === 'failed') {
        alert(`${result.reason}\n\nCytoscape Web will now reload.`)
        reload()
      }
    })
  }

  const closeMenu = useCallback((): void => {
    setOpen(false)
  }, [setOpen])

  // Service apps whose cyWebMenuItem.root resolves to the Help menu.
  const { menuItems: serviceMenuItems, dialogs } = useServiceAppMenu(
    RootMenu.Help,
    closeMenu,
  )

  const builtInItems = [
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
        {
          separator: true,
        },
        {
          template: (
            <ClearLocalCacheMenuItem
              onClick={openDialogFromMenu('clear-local-cache')}
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
  ]
  const menuItems = appendServiceMenuItems(builtInItems, serviceMenuItems)

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
        <LazyDialogBoundary
          name="Import Database Snapshot"
          open={openDialog === 'import-database'}
        >
          <Suspense fallback={null}>
            <ImportDatabaseSnapshotDialog
              open={openDialog === 'import-database'}
              onClose={handleCloseDialog}
            />
          </Suspense>
        </LazyDialogBoundary>
      )}
      <ConfirmationDialog
        title="Clear Local Cache?"
        message="This will permanently delete all cached networks, styles, filters, installed apps and settings. This action cannot be undone."
        onConfirm={handleClearLocalCache}
        open={openDialog === 'clear-local-cache'}
        setOpen={(open) => setOpenDialog(open ? 'clear-local-cache' : null)}
        buttonTitle="Clear Cache"
        isAlert
      />
      {dialogs}
    </>
  )
}
