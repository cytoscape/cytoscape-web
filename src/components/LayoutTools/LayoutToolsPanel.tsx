import { Box, Divider, Theme, Typography, useTheme } from '@mui/material'
import { Scaling } from './Scaling'
import { IdType } from '../../models/IdType'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useUiStateStore } from '../../store/UiStateStore'

/**
 * React component for manual layout UI.
 *
 */
export const ManualLayoutPanel = (): JSX.Element => {
  const theme: Theme = useTheme()
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const targetNetworkId: IdType =
    activeNetworkId === undefined || activeNetworkId === ''
      ? currentNetworkId
      : activeNetworkId

  return (
    <Box sx={{ width: '100%', height: '100%', padding: theme.spacing(1) }}>
      <Typography variant={'subtitle1'}>Layout Tools</Typography>
      <Divider />
      <Scaling networkId={targetNetworkId} />
      <Divider />
    </Box>
  )
}
