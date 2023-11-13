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
  onClose: () => void
}): ReactElement => {
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

  const { id, currentNetworkId } = workspace

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

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
          {`There is a newer version of the network '${
            summary?.name ?? ''
          }' with changes on NDEx.  Would you like to update your network with the latest version?`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {loading && <CircularProgress />}
        {!authenticated ? (
          <Button
            onClick={() => {
              client
                ?.login()
                .then((result) => {
                  console.log('* Login success', result)
                })
                .catch((error: any) => {
                  console.warn('Failed to login', error)
                })
            }}
          >
            Sign in to create a copy to NDEx
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              disabled={!authenticated || loading}
              onClick={async () => {
                const parsed = parsePathName(location.pathname)
                const { networkId } = parsed
                setLoading(true)
                deleteNetwork(networkId)
                await waitSeconds(2)
                addNetworkIds(networkId)
                await waitSeconds(2)
                setCurrentNetworkId(networkId)
                await waitSeconds(2)
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
          </>
        )}
        <Button
          variant="outlined"
          disabled={loading}
          onClick={() => {
            props.onClose()
          }}
          color="error"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
