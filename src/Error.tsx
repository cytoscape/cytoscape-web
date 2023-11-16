import { Button, Grid, Typography } from '@mui/material'
import { ReactElement } from 'react'
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from 'react-router-dom'
import { useWorkspaceStore } from './store/WorkspaceStore'

export const Error = (): ReactElement => {
  const error = useRouteError()
  const navigate = useNavigate()
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)

  const handleReset = (): void => {
    resetWorkspace()
    navigate('/')
    navigate(0)
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
          Your local cache might contain outdated 
          workspace data and it can be the cause of this error. 
          Please reset your local workspace cache and restart 
          the app using the button below.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Button variant="outlined" color={'warning'} onClick={handleReset}>
          Reset Workspace and Reload Cytoscape
        </Button>
      </Grid>
    </Grid>
  )
}
