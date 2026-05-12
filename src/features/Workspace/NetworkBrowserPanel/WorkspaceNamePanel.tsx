import { Box, Tooltip, Typography } from '@mui/material'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { Workspace } from '../../../models'
import { dateFormatter } from '../../../utils/dateFormat'

export const WorkspaceNamePanel = () => {
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)

  return (
    <Box
      data-testid="workspace-name-panel"
      sx={{
        width: '100%',
        p: (theme) => theme.spacing(1),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Tooltip
        title={`This workspace was created at ${dateFormatter(workspace.creationTime)}`}
        placement="bottom"
        sx={{ flexGrow: 1, width: '100%' }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
          }}
        >
          <Typography
            sx={{
              textAlign: 'center',
              width: '100%',
              color: (theme) => theme.palette.text.secondary,
            }}
            variant="subtitle2"
          >
            {workspace.name}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  )
}
