import { Box } from '@mui/material'

import { useUiStateStore } from '../../hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../hooks/stores/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { Scaling } from './Scaling'

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
    <Box
      data-testid="layout-tools-panel"
      sx={{ width: '100%', height: '100%', paddingBottom: 1 }}
    >
      <Scaling networkId={targetNetworkId} />
    </Box>
  )
}
