import { lazy, ReactElement, Suspense, useState } from 'react'

import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { logUi } from '@/debug'
import { MessageSeverity } from '@/models/MessageModel'
import { ConfirmationDialog } from '@/features/ConfirmationDialog'

// Lazy: the upload dialog pulls in the dropzone/dialog stack, which would
// otherwise ship with the eager toolbar chunk.
const DatabaseSnapshotFileUpload = lazy(() =>
  import('@/features/ToolBar/DatabaseSnapshotFileUpload').then((m) => ({
    default: m.DatabaseSnapshotFileUpload,
  })),
)

interface ImportDatabaseSnapshotDialogProps {
  open: boolean
  /** The flow is over: cancelled at either step, or the import ran. */
  onClose: () => void
}

/**
 * Help > Developer > Import Database Snapshot: the file picker, then a
 * confirmation that the import replaces the local database. Owned by
 * `HelpMenu`, not by the menu row, so it outlives the menu that opened it
 * (see `LicenseDialog`).
 */
export const ImportDatabaseSnapshotDialog = ({
  open,
  onClose,
}: ImportDatabaseSnapshotDialogProps): ReactElement => {
  // The chosen file; while set, the confirmation replaces the picker.
  const [file, setFile] = useState<File | null>(null)
  const addMessage = useMessageStore((state) => state.addMessage)

  const finish = (): void => {
    setFile(null)
    onClose()
  }

  const handleImport = async (): Promise<void> => {
    if (!file) {
      return
    }

    try {
      // Loaded on demand: the snapshot module is heavy and the Help menu is
      // eager via the ToolBar, so a static import would put it on cold load.
      const { importDatabaseSnapshotFromFile } = await import(
        '@/data/db/snapshot'
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
        // Reload the page to reflect imported data
        window.location.reload()
      } else {
        const errorMsg = result.errors?.join(', ') || 'Unknown error'
        addMessage({
          message: `Database snapshot import completed with errors: ${errorMsg}`,
          duration: 7000,
          severity: MessageSeverity.WARNING,
        })
      }
    } catch (error) {
      logUi.error(
        `[${ImportDatabaseSnapshotDialog.name}]:[${handleImport.name}] Failed to import database snapshot`,
        error,
      )
      addMessage({
        message:
          'Failed to import database snapshot. Please check the file format and try again.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    } finally {
      finish()
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <DatabaseSnapshotFileUpload
          show={open && file === null}
          handleClose={finish}
          onFileSelect={(selectedFile: File) => {
            setFile(selectedFile)
          }}
        />
      </Suspense>
      <ConfirmationDialog
        title="Import Database Snapshot"
        message={`Are you sure you want to import the database snapshot from "${file?.name}"? This will replace all existing data in the database. This action cannot be undone.`}
        onConfirm={handleImport}
        onCancel={finish}
        open={open && file !== null}
        setOpen={(value: boolean) => {
          if (!value) {
            finish()
          }
        }}
        buttonTitle="Import (cannot be undone)"
        isAlert={true}
      />
    </>
  )
}
