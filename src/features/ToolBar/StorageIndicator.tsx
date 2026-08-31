import CloudOffIcon from '@mui/icons-material/CloudOff'
import CloudQueueIcon from '@mui/icons-material/CloudQueue'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CloudSyncIcon from '@mui/icons-material/CloudSync'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { Box, Tooltip, Typography } from '@mui/material'

import { usePersistenceStatusStore } from '@/data/hooks/stores/PersistenceStatusStore'
import { useOnlineStatus } from '@/data/hooks/useOnlineStatus'
import { PersistenceStatus } from '@/models/StoreModel/PersistenceStatusStoreModel'
import { darkPalette } from '@/theme'

/** `3:45 PM` — the last-saved stamp is same-session, so the date adds nothing. */
const timeOnly = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('en-US', { timeStyle: 'short' })

const LOCAL_STORAGE_EXPLANATION =
  'Your workspace stays in this browser until you clear it or export a backup. Nothing is sent to NDEx unless you ask.'

interface IndicatorLook {
  label: string
  tooltip: string
  color: string
  icon: JSX.Element
}

const storageLook = (
  status: PersistenceStatus,
  lastSavedAt: number | undefined,
  lastError: string | undefined,
): IndicatorLook => {
  const iconSx = { fontSize: 16 }

  if (status === 'saving') {
    return {
      label: 'Saving locally…',
      tooltip: `Saving your workspace to this browser. ${LOCAL_STORAGE_EXPLANATION}`,
      color: darkPalette.text.primary,
      icon: <CloudSyncIcon sx={iconSx} />,
    }
  }

  if (status === 'failed') {
    return {
      label: 'Unable to save locally',
      tooltip:
        `This browser rejected the last write${lastError !== undefined ? ` (${lastError})` : ''}. ` +
        'Your recent changes exist only in this tab. Export a workspace backup or save your network to NDEx.',
      color: '#ffb4a9',
      icon: <ErrorOutlineIcon sx={iconSx} />,
    }
  }

  // 'idle' and 'saved' read the same to the user — the workspace is on disk
  // either way. They differ only in whether this session has written yet.
  return {
    label: 'Saved in this browser',
    tooltip:
      (lastSavedAt !== undefined
        ? `Last saved locally: ${timeOnly(lastSavedAt)}. `
        : '') + LOCAL_STORAGE_EXPLANATION,
    color: '#8fd19e',
    icon: <CheckCircleOutlineIcon sx={iconSx} />,
  }
}

/**
 * Toolbar readout of where the workspace lives and whether it is reaching
 * this browser's storage (#697).
 *
 * Two separate facts, deliberately shown side by side: local persistence
 * (left) keeps working while the connection (right) is down, and only remote
 * operations such as NDEx depend on the second one.
 */
export const StorageIndicator = (): JSX.Element => {
  const status = usePersistenceStatusStore((state) => state.status)
  const lastSavedAt = usePersistenceStatusStore((state) => state.lastSavedAt)
  const lastError = usePersistenceStatusStore((state) => state.lastError)
  const online = useOnlineStatus()

  const look = storageLook(status, lastSavedAt, lastError)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 1.5 }}>
      <Tooltip title={look.tooltip}>
        <Box
          data-testid="storage-indicator"
          data-status={status}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: look.color,
          }}
        >
          {look.icon}
          <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
            {look.label}
          </Typography>
        </Box>
      </Tooltip>

      <Tooltip
        title={
          online
            ? 'Connected. NDEx and other remote services are available.'
            : 'No connection. Local editing and autosave keep working; NDEx and other remote services are unavailable.'
        }
      >
        <Box
          data-testid="connectivity-indicator"
          data-online={online ? 'true' : 'false'}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: online ? darkPalette.text.secondary : '#ffcc80',
          }}
        >
          {online ? (
            <CloudQueueIcon sx={{ fontSize: 16 }} />
          ) : (
            <CloudOffIcon sx={{ fontSize: 16 }} />
          )}
          <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
            {online ? 'Online' : 'Offline'}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  )
}
