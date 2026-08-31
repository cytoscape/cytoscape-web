import { Alert, Box, Button } from '@mui/material'
import { ReactElement, useState } from 'react'

import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { logUi } from '@/debug'
import { useOnboardingStore } from '@/features/Onboarding/store/OnboardingStore'
import { MessageSeverity } from '@/models/MessageModel'

/**
 * Id under which the dismissal is recorded in `OnboardingStore.dismissedHints`,
 * which persists to localStorage. Changing it makes the reminder reappear for
 * everyone who has already dismissed it.
 */
export const BACKUP_REMINDER_HINT_ID = 'localStorageBackup'

/**
 * How many networks make a workspace worth backing up.
 *
 * One network is usually something the user just opened and can trivially open
 * again; by the third they have arranged something they would not want to
 * rebuild. Reminding earlier trains people to dismiss it unread.
 */
const REMIND_AT_NETWORK_COUNT = 3

/**
 * One-time notice that browser storage is not a backup (#697).
 *
 * Shown once the workspace holds enough to be worth losing, and never again
 * after it is dismissed. Deliberately not a modal or a toast: the point is
 * that browser storage is durable enough for normal use, so an interruption
 * would misrepresent the risk.
 */
export const BackupReminder = (): ReactElement | null => {
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)
  const dismissedHints = useOnboardingStore((state) => state.dismissedHints)
  const dismissHint = useOnboardingStore((state) => state.dismissHint)
  const addMessage = useMessageStore((state) => state.addMessage)
  const [exporting, setExporting] = useState(false)

  const dismissed = dismissedHints.includes(BACKUP_REMINDER_HINT_ID)
  if (dismissed || networkIds.length < REMIND_AT_NETWORK_COUNT) {
    return null
  }

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      // Loaded on demand: the snapshot module is heavy, and this component
      // renders inside the eager workspace chunk.
      const { exportDatabaseSnapshotToFile } = await import(
        '@/data/db/snapshot'
      )
      await exportDatabaseSnapshotToFile()
      addMessage({
        message: 'Workspace backup exported.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
      // Dismissed on success only: a failed export leaves the user with no
      // backup, which is exactly the state the reminder exists for.
      dismissHint(BACKUP_REMINDER_HINT_ID)
    } catch (error) {
      logUi.error(
        `[${BackupReminder.name}]:[handleExport] Failed to export the workspace backup`,
        error,
      )
      addMessage({
        message: 'Failed to export the workspace backup. Please try again.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Alert
      data-testid="backup-reminder"
      severity="info"
      variant="outlined"
      sx={{ m: 1, py: 0.5, fontSize: 12, alignItems: 'flex-start' }}
      onClose={() => dismissHint(BACKUP_REMINDER_HINT_ID)}
    >
      This workspace lives in this browser. Clearing site data, switching
      browsers or profiles, and private windows all lose it. Keep a copy you
      control.
      <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
        <Button
          data-testid="backup-reminder-export"
          size="small"
          variant="outlined"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          Export Backup
        </Button>
        <Button
          data-testid="backup-reminder-dismiss"
          size="small"
          onClick={() => dismissHint(BACKUP_REMINDER_HINT_ID)}
        >
          Not now
        </Button>
      </Box>
    </Alert>
  )
}
