import {
  Box,
  IconButton,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { Workspace } from '../../../models'
import EditIcon from '@mui/icons-material/Edit'

export const WorkspaceNamePanel = () => {
  const theme: Theme = useTheme()
  const background = theme.palette.primary.dark
  const textColor = theme.palette.primary.contrastText
  const borderColor = theme.palette.divider

  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: background,
        color: textColor,
        p: theme.spacing(1),
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
          onClick={() => {
            console.log('Edit workspace properties')
          }}
        >
          <EditIcon sx={{ fontSize: '1em', color: textColor }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
