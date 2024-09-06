import {
  Box,
  IconButton,
  TextField,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { Workspace } from '../../../models'
import EditIcon from '@mui/icons-material/Edit'
import { useState } from 'react'

export const WorkspaceNamePanel = () => {
  const theme: Theme = useTheme()
  const background = theme.palette.primary.dark
  const textColor = theme.palette.primary.contrastText
  const borderColor = theme.palette.divider

  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const setWorkspaceName = useWorkspaceStore((state) => state.setName)

  const [isEditing, setIsEditing] = useState<boolean>(false)

  const handleNameChange = (event: any): void => {
    setWorkspaceName(event.target.value)
  }

  const handleBlur = () => {
    setIsEditing(false)
  }

  const handleKeyDown = (event: any): void => {
    if (event.key === 'Escape' || event.key === 'Enter') {
      setIsEditing(false)
    }
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '3em',
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
        title={`This workspace was created at ${workspace.creationTime.toLocaleString()}`}
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
          <Typography variant="body1">Name:</Typography>
          {isEditing ? (
            <TextField
              value={workspace.name}
              onChange={handleNameChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              variant="outlined"
              size="small"
              sx={{
                p: 0,
                width: '100%',
                paddingLeft: '1em',
              }}
              inputProps={{
                style: {
                  color: textColor,
                },
              }}
            />
          ) : (
            <Typography
              sx={{ paddingLeft: '1em' }}
              variant="subtitle1"
              color={'info'}
            >
              {workspace.name}
            </Typography>
          )}
        </Box>
      </Tooltip>
      {isEditing ? null : (
        <Tooltip title="Edit workspace name">
          <IconButton
            size="small"
            disabled={isEditing}
            onClick={() => {
              setIsEditing(true)
            }}
            sx={{ visibility: isEditing ? 'hidden' : 'visible' }}
          >
            <EditIcon sx={{ fontSize: '1em', color: textColor }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}
