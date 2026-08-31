import { Box, Chip, Tooltip, Typography } from '@mui/material'

import { usePersistenceStatusStore } from '../../../data/hooks/stores/PersistenceStatusStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { Workspace } from '../../../models'
import { PersistenceStatus } from '../../../models/StoreModel/PersistenceStatusStoreModel'
import { dateFormatter } from '../../../utils/dateFormat'

/**
 * Second line under the workspace name: whether autosave is currently working.
 *
 * `idle` and `saved` read the same — the workspace is on disk either way, and
 * the distinction (has this session written yet) is not one a user has a
 * question about.
 */
const autosaveLine = (
  status: PersistenceStatus,
  lastSavedAt: number | undefined,
): { text: string; warn: boolean } => {
  if (status === 'saving') {
    return { text: 'Saving locally…', warn: false }
  }
  if (status === 'failed') {
    return { text: 'Autosave failed', warn: true }
  }
  if (lastSavedAt !== undefined) {
    return {
      text: `Autosaved locally: ${new Date(lastSavedAt).toLocaleTimeString(
        'en-US',
        { timeStyle: 'short' },
      )}`,
      warn: false,
    }
  }
  return { text: 'Autosaved locally', warn: false }
}

/**
 * Workspace name, where the workspace came from, and whether it is still
 * reaching this browser's storage (#697).
 *
 * The origin chip reports `workspace.isRemote`, not "this is stored locally":
 * a workspace loaded from NDEx has a working copy in this browser exactly like
 * a local one, so a flat "Local workspace" label would be false for it — and
 * would contradict the `NDEx` chips on the network rows below.
 */
export const WorkspaceNamePanel = () => {
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const status = usePersistenceStatusStore((state) => state.status)
  const lastSavedAt = usePersistenceStatusStore((state) => state.lastSavedAt)

  const isRemote = workspace.isRemote === true
  const autosave = autosaveLine(status, lastSavedAt)
  const named = workspace.id !== ''

  return (
    <Box
      data-testid="workspace-name-panel"
      sx={{
        width: '100%',
        p: (theme) => theme.spacing(1),
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 1,
          width: '100%',
        }}
      >
        <Tooltip
          title={
            named
              ? `This workspace was created at ${dateFormatter(workspace.creationTime)}`
              : ''
          }
          placement="bottom"
        >
          <Typography
            sx={{
              color: (theme) => theme.palette.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            variant="subtitle2"
          >
            {named ? workspace.name : <>&nbsp;</>}
          </Typography>
        </Tooltip>

        {named && (
          <Tooltip
            title={
              isRemote
                ? 'Opened from NDEx. Your working copy is stored in this browser; NDEx is only updated when you save to it.'
                : 'This workspace exists only in this browser. Save it to NDEx or export a workspace backup to keep a copy elsewhere.'
            }
            placement="bottom"
          >
            <Chip
              data-testid="workspace-origin-chip"
              size="small"
              variant="outlined"
              sx={{ height: 18, opacity: 0.8 }}
              label={
                <Typography sx={{ fontSize: 10 }} variant="caption">
                  {isRemote ? 'From NDEx' : 'Local workspace'}
                </Typography>
              }
            />
          </Tooltip>
        )}
      </Box>

      {named && (
        <Typography
          data-testid="workspace-autosave-line"
          variant="caption"
          sx={{
            fontSize: 10,
            color: (theme) =>
              autosave.warn
                ? theme.palette.warning.main
                : theme.palette.text.disabled,
          }}
        >
          {autosave.text}
        </Typography>
      )}
    </Box>
  )
}
