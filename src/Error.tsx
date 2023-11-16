import { Button, Grid, Typography } from '@mui/material'
import { ReactElement, useState } from 'react'
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from 'react-router-dom'
import { ConfirmationDialog } from './components/Util/ConfirmationDialog'
import { useWorkspaceStore } from './store/WorkspaceStore'

export const Error = (): ReactElement => {
  const error = useRouteError()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)

  const handleReset = (): void => {
    handleClose()
    resetWorkspace()
    navigate('/')
    navigate(0)
  }

  const handleClickOpen = (): void => {
    setOpen(true)
  }

  const handleClose = (): void => {
    setOpen(false)
  }
  
  let status = 'Unknown'
  if (isRouteErrorResponse(error)) {
    const { statusText } = error
    status = statusText
  }

  return (
    <Grid
      container
      direction="column"
      alignItems="left"
      justifyContent="center"
      spacing={2}
      sx={{ padding: 2 }}
    >
      <Grid item xs={12}>
        <Typography variant="h4">Error:</Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography>An unexpected error has occurred.</Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2">
          <i>Error status: {status}</i>
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body1">
          If this persists, you can reset your local workspace cache and
          restart the app.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Button variant="outlined" color={'warning'} onClick={handleClickOpen}>
          Reset and Reload Cytoscape
        </Button>
        <ConfirmationDialog
          title="Reset Local Workspace Cache"
          message="Are you sure you want to reset all local workspace and restart the app? (This deletes all of the local cache)"
          onConfirm={handleReset}
          open={open}
          setOpen={setOpen}
          buttonTitle="Reset and Reload the Workspace (cannot be undone)"
        />
      </Grid>
    </Grid>
  )
}
