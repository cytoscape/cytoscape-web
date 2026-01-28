import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { ReactElement, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useDeleteCyNetwork } from '../data/hooks/useDeleteCyNetwork'
import { useUrlNavigation } from '../data/hooks/navigation/useUrlNavigation'
import { useCredentialStore } from '../data/hooks/stores/CredentialStore'
import { useNetworkSummaryStore } from '../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'
import { waitSeconds } from '../utils/waitSeconds'

export const UpdateNetworkDialog = (props: {
  open: boolean
  networkId: string
  onClose: () => void
}): ReactElement => {
  const { networkId } = props
  const [loading, setLoading] = useState<boolean>(false)
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const { deleteNetwork } = useDeleteCyNetwork()
  const addNetworkIds = useWorkspaceStore((state) => state.addNetworkIds)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const client = useCredentialStore((state) => state.client)

  const authenticated = client?.authenticated ?? false

  const { id } = workspace

  const summary = useNetworkSummaryStore((state) => state.summaries[networkId])

  const location = useLocation()

  return (
    <Dialog
      data-testid="update-network-dialog"
      sx={{ zIndex: 10000 }}
      onClose={() => {
        props.onClose()
      }}
      open={props.open}
    >
      <DialogTitle>Networks out of sync</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {`The network: ${summary?.name} in your local cache is outdated.  Would you like to update it from NDEx?`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {loading && <CircularProgress size={30} />}
        <Button
          data-testid="update-network-dialog-cancel"
          variant="outlined"
          disabled={loading}
          onClick={() => {
            props.onClose()
          }}
          color="primary"
        >
          Cancel
        </Button>
        <Button
          data-testid="update-network-dialog-update"
          sx={{
            color: '#FFFFFF',
            backgroundColor: '#337ab7',
            '&:hover': {
              backgroundColor: '#285a9b',
            },
          }}
          disabled={!authenticated || loading}
          onClick={async () => {
            setLoading(true)
            deleteNetwork(networkId, { navigate: false })
            await waitSeconds(1)
            addNetworkIds(networkId)
            await waitSeconds(1)
            setCurrentNetworkId(networkId)
            navigateToNetwork({
              workspaceId: id,
              networkId: networkId,
              searchParams: new URLSearchParams(location.search),
              replace: true,
            })
            setLoading(false)
            props.onClose()
          }}
        >
          Update
        </Button>
      </DialogActions>
    </Dialog>
  )
}
