import UploadIcon from '@mui/icons-material/Upload'
import { lazy, ReactElement, Suspense, useState } from 'react'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { logUi } from '../../../debug'
import { MessageSeverity } from '../../../models/MessageModel'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

// Lazy: the upload dialog wraps the Mantine dropzone/modals stack, which
// would otherwise ship with the eager toolbar chunk.
const DatabaseSnapshotFileUpload = lazy(() =>
  import('../DatabaseSnapshotFileUpload').then((m) => ({
    default: m.DatabaseSnapshotFileUpload,
  })),
)


export const ImportDatabaseMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const [showUpload, setShowUpload] = useState(false)
  // Mount latch for the lazy upload dialog: stays true after the first open
  // so the close animation still plays and reopening is instant.
  const [hasShownUpload, setHasShownUpload] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const addMessage = useMessageStore((state) => state.addMessage)

  const handleFileSelect = async (selectedFile: File): Promise<void> => {
    setFile(selectedFile)
    setShowUpload(false)
    setShowConfirm(true)
  }

  const handleImport = async (): Promise<void> => {
    if (!file) {
      return
    }

    try {
      // Loaded on demand: the snapshot module is heavy and this menu item is
      // eager via the ToolBar, so a static import would put it on cold load.
      const { importDatabaseSnapshotFromFile } = await import(
        '../../../data/db/snapshot'
      )
      const result = await importDatabaseSnapshotFromFile(file, {
        merge: false, // Replace existing data
      })

      if (result.success) {
        const totalImported = Object.values(result.importedCounts).reduce(
          (sum, count) => sum + count,
          0,
        )
        addMessage({
          message: `Database snapshot imported successfully. ${totalImported} records imported.`,
          duration: 5000,
          severity: MessageSeverity.SUCCESS,
        })
        // Close menu and confirmation dialog before reload
        props.onClick()
        setShowConfirm(false)
        // Reload the page to reflect imported data
        window.location.reload()
      } else {
        const errorMsg = result.errors?.join(', ') || 'Unknown error'
        addMessage({
          message: `Database snapshot import completed with errors: ${errorMsg}`,
          duration: 7000,
          severity: MessageSeverity.WARNING,
        })
        // Close menu and confirmation dialog after showing error
        props.onClick()
        setShowConfirm(false)
      }
    } catch (error) {
      logUi.error(
        `[${ImportDatabaseMenuItem.name}]:[${handleImport.name}] Failed to import database snapshot`,
        error,
      )
      addMessage({
        message:
          'Failed to import database snapshot. Please check the file format and try again.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
      // Close menu and confirmation dialog after showing error
      props.onClick()
      setShowConfirm(false)
    } finally {
      setFile(null)
    }
  }

  const handleCancel = (): void => {
    setShowConfirm(false)
    setFile(null)
  }

  const handleMenuItemClick = (): void => {
    setHasShownUpload(true)
    setShowUpload(true)
  }

  return (
    <>
      <DropdownMenuItem
        label="Import Database Snapshot..."
        icon={<UploadIcon />}
        onClick={handleMenuItemClick}
      />
      {hasShownUpload && (
        <Suspense fallback={null}>
          <DatabaseSnapshotFileUpload
            show={showUpload}
            handleClose={() => {
              setShowUpload(false)
            }}
            onFileSelect={handleFileSelect}
          />
        </Suspense>
      )}
      <ConfirmationDialog
        title="Import Database Snapshot"
        message={`Are you sure you want to import the database snapshot from "${file?.name}"? This will replace all existing data in the database. This action cannot be undone.`}
        onConfirm={handleImport}
        onCancel={handleCancel}
        open={showConfirm}
        setOpen={setShowConfirm}
        buttonTitle="Import (cannot be undone)"
        isAlert={true}
      />
    </>
  )
}
