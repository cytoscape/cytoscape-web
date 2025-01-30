import { Box, Theme, Tooltip, Typography, useTheme } from '@mui/material'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { Workspace } from '../../../models'
import { dateFormatter } from '../../../utils/date-format'

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
        height: '42px',
        backgroundColor: background,
        color: textColor,
        p: theme.spacing(1),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: `2px solid ${borderColor}`,
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
          <Typography sx={{ ml: 0.5 }} variant="body1">
            Name:
          </Typography>
          <Typography
            sx={{ paddingLeft: '1em' }}
            variant="subtitle1"
            color={'info'}
          >
            {workspace.name}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  )
}
