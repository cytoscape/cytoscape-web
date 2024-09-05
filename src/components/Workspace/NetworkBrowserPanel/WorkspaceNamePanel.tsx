import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { Workspace } from '../../../models'
import EditIcon from '@mui/icons-material/Edit'

export const WorkspaceNamePanel = () => {
  const theme = useTheme()
  const background = theme.palette.background.paper
  const borderColor = theme.palette.divider

  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: background,
        p: '0.5em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `2px solid ${borderColor}`,
      }}
    >
      <Tooltip
        title={`Created at ${workspace.creationTime.toLocaleString()}`}
        placement="top"
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2">Name:</Typography>
          <Typography
            sx={{ paddingLeft: '1em' }}
            variant="subtitle1"
            color={'info'}
          >
            {workspace.name}
          </Typography>
        </Box>
      </Tooltip>
      <Tooltip title="Edit workspace properties">
        <IconButton
          size="small"
          sx={{ width: 25, height: 25 }}
          onClick={(e) => {
            console.log('Edit workspace properties')
          }}
        >
          <EditIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
