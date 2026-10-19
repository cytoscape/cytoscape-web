import { Box, Typography } from '@mui/material'
import { type ReactElement, useContext } from 'react'

import { AppConfigContext } from '@/AppConfigContext'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { buildShareUrl } from '@/features/FloatingToolBar/shareUrl'
import { SelectionStates } from '@/features/FloatingToolBar/useCopyShareableNetworkUrl'
import type { IdType } from '@/models/IdType'

const EMPTY: IdType[] = []
/** The share button caps the selection it encodes; see the Advanced page. */
const MAX_SELECTED = 300

/**
 * The link the share button would build for this network and its current
 * selection, using the same parameter names and URL builder.
 */
export const DemoUrlPanel = ({
  networkId,
}: {
  networkId: IdType
}): ReactElement => {
  const { urlBaseName } = useContext(AppConfigContext)
  const nodes = useViewModelStore(
    (s) => s.getViewModel(networkId)?.selectedNodes ?? EMPTY,
  )
  const edges = useViewModelStore(
    (s) => s.getViewModel(networkId)?.selectedEdges ?? EMPTY,
  )

  const params = new URLSearchParams()
  if (nodes.length > 0 && nodes.length + edges.length <= MAX_SELECTED) {
    params.set(SelectionStates.SelectedNodes, nodes.join(' '))
  }
  if (edges.length > 0 && nodes.length + edges.length <= MAX_SELECTED) {
    params.set(SelectionStates.SelectedEdges, edges.join(' '))
  }
  const url = buildShareUrl(
    window.location.origin,
    urlBaseName,
    networkId,
    params.toString(),
  )

  return (
    <Box sx={{ p: 1.5, overflowY: 'auto', height: '100%' }}>
      <Typography variant="body2" gutterBottom>
        Select nodes or edges in the network. The link below updates.
      </Typography>
      <Box
        component="code"
        data-testid="manual-demo-url"
        sx={{
          display: 'block',
          p: 1,
          fontSize: '0.75rem',
          wordBreak: 'break-all',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        {url}
      </Box>
      <Typography variant="caption" color="text.secondary" component="p">
        {nodes.length} node(s) and {edges.length} edge(s) selected. This demo
        network is not on NDEx, so the link shows the format only; a link to a
        network saved on NDEx opens it with the same selection.
      </Typography>
    </Box>
  )
}
