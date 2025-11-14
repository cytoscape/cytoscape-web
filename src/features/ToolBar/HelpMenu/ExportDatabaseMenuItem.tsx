import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'

import { logUi } from '../../../debug'
import { exportDatabaseSnapshotToFile } from '../../../db'
import { useMessageStore } from '../../../hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { BaseMenuProps } from '../BaseMenuProps'

export const ExportDatabaseMenuItem = (props: BaseMenuProps): ReactElement => {
  const addMessage = useMessageStore((state) => state.addMessage)

  const handleExport = async (): Promise<void> => {
    try {
      props.handleClose()
      await exportDatabaseSnapshotToFile()
      addMessage({
        message: 'Database snapshot exported successfully.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (error) {
      logUi.error(
        `[${ExportDatabaseMenuItem.name}]:[${handleExport.name}] Failed to export database snapshot`,
        error,
      )
      addMessage({
        message: 'Failed to export database snapshot. Please try again.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  return <MenuItem onClick={handleExport}>Export Database Snapshot...</MenuItem>
}
