import DownloadIcon from '@mui/icons-material/Download'
import { ReactElement } from 'react'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { logUi } from '../../../debug'
import { MessageSeverity } from '../../../models/MessageModel'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'


export const ExportDatabaseMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const addMessage = useMessageStore((state) => state.addMessage)

  const handleExport = async (): Promise<void> => {
    try {
      props.onClick()
      // Loaded on demand: the snapshot module is heavy and this menu item is
      // eager via the ToolBar, so a static import would put it on cold load.
      const { exportDatabaseSnapshotToFile } = await import(
        '../../../data/db/snapshot'
      )
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

  return (
    <DropdownMenuItem
      label="Export Database Snapshot"
      icon={<DownloadIcon />}
      onClick={handleExport}
    />
  )
}
