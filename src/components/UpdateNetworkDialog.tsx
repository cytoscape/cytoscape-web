import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material'
import { ReactElement, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCredentialStore } from '../store/CredentialStore'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { parsePathName } from '../utils/paths-util'
import { waitSeconds } from '../utils/wait-seconds'

export const UpdateNetworkDialog = (props: {
  open: boolean
  networkId: string
  onClose: () => void
}): ReactElement => {
  const { networkId } = props
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const deleteNetwork = useWorkspaceStore((state) => state.deleteNetwork)
  const addNetworkIds = useWorkspaceStore((state) => state.addNetworkIds)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const client = useCredentialStore((state) => state.client)

  const authenticated = client?.authenticated ?? false

  const { id } = workspace

  const summary = useNetworkSummaryStore((state) => state.summaries[networkId])

  const deleteNetworkModifiedStatus = useWorkspaceStore(
    (state) => state.deleteNetworkModifiedStatus,
  )

  const location = useLocation()

  return (
    <Dialog
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
            deleteNetwork(networkId)
            await waitSeconds(1)
            addNetworkIds(networkId)
            await waitSeconds(1)
            setCurrentNetworkId(networkId)
            await waitSeconds(1)
            deleteNetworkModifiedStatus(networkId)
            navigate(
              `/${id}/networks/${networkId}${location.search.toString()}`,
            )
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
