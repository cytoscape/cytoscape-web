import DownloadIcon from '@mui/icons-material/Download'
import { ReactElement } from 'react'

import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { logUi } from '@/debug'
import { MessageSeverity } from '@/models/MessageModel'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Writes the whole local workspace — every network, table, style and the
 * workspace row itself — to a file the user can keep.
 *
 * Named for what it is to a user rather than for the storage underneath
 * (#697): this was `Export Database Snapshot` under Help > Developer, where
 * the one durable backup of a local-first app was effectively hidden.
 */
export const ExportWorkspaceBackupMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const addMessage = useMessageStore((state) => state.addMessage)

  const handleExport = async (): Promise<void> => {
    try {
      props.onClick()
      // Loaded on demand: the snapshot module is heavy and this menu item is
      // eager via the ToolBar, so a static import would put it on cold load.
      const { exportDatabaseSnapshotToFile } = await import(
        '@/data/db/snapshot'
      )
      await exportDatabaseSnapshotToFile()
      addMessage({
        message: 'Workspace backup exported.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (error) {
      logUi.error(
        `[${ExportWorkspaceBackupMenuItem.name}]:[${handleExport.name}] Failed to export database snapshot`,
        error,
      )
      addMessage({
        message: 'Failed to export the workspace backup. Please try again.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  return (
    <DropdownMenuItem
      label="Export Workspace Backup..."
      icon={<DownloadIcon />}
      onClick={handleExport}
    />
  )
}
