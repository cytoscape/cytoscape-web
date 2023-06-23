import { Box, Theme, Typography, useTheme } from '@mui/material'
import { Scaling } from './Scaling'
import { IdType } from '../../models/IdType'
import { useWorkspaceStore } from '../../store/WorkspaceStore'

/**
 * React component for manual layout UI.
 *
 */
export const ManualLayoutPanel = (): JSX.Element => {
  const theme: Theme = useTheme()
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  return (
    <Box sx={{ width: '100%', height: '100%', padding: theme.spacing(1) }}>
      <Typography variant={'subtitle1'}>Manual Layout Tools</Typography>
      <Scaling networkId={currentNetworkId} />
    </Box>
  )
}
