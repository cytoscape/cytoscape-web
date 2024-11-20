import { Scaling } from './Scaling'
import { IdType } from '../../models/IdType'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useUiStateStore } from '../../store/UiStateStore'
import { Box } from '@mui/material'

/**
 * React component for manual layout UI.
 *
 */
export const LayoutToolsPanel = (): JSX.Element => {
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
    <Box sx={{ width: '100%', height: '100%', paddingBottom: 1 }}>
      <Scaling networkId={targetNetworkId} />
    </Box>
  )
}
