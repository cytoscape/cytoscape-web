import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'

import { logUi } from '../../../debug'
import { importDatabaseSnapshotFromFile } from '../../../db'
import { useMessageStore } from '../../../hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import { DatabaseSnapshotFileUpload } from '../DatabaseSnapshotFileUpload'
import { BaseMenuProps } from '../BaseMenuProps'

export const ImportDatabaseMenuItem = (props: BaseMenuProps): ReactElement => {
  const [showUpload, setShowUpload] = useState(false)
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
        props.handleClose()
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
        props.handleClose()
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
      props.handleClose()
      setShowConfirm(false)
    } finally {
      setFile(null)
    }
  }

  const handleCancel = (): void => {
    setShowConfirm(false)
    setFile(null)
  }

  const handleMenuItemClick = (event: React.MouseEvent<HTMLElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    setShowUpload(true)
  }

  return (
    <>
      <MenuItem onClick={handleMenuItemClick}>
        Import Database Snapshot...
      </MenuItem>
      <DatabaseSnapshotFileUpload
        show={showUpload}
        handleClose={() => {
          setShowUpload(false)
        }}
        onFileSelect={handleFileSelect}
      />
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
