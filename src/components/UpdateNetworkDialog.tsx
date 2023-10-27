import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material'
import { ReactElement, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppConfigContext } from '../AppConfigContext'
import { Network } from '../models/NetworkModel'
import { useCredentialStore } from '../store/CredentialStore'
import { useMessageStore } from '../store/MessageStore'
import { useNetworkStore } from '../store/NetworkStore'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'
import { useTableStore } from '../store/TableStore'
import { useViewModelStore } from '../store/ViewModelStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { IdType } from '../models/IdType'
import { exportNetworkToCx2 } from '../store/io/exportCX'
import { parsePathName } from '../utils/paths-util'

// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

function waitSeconds(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000)
  })
}

export const UpdateNetworkDialog = (props: {
  open: boolean
  onClose: () => void
}): ReactElement => {
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()
  //   const setWorkspace = useWorkspaceStore((state) => state.set)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const deleteNetwork = useWorkspaceStore((state) => state.deleteNetwork)
  const addNetworkIds = useWorkspaceStore((state) => state.addNetworkIds)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )
  const client = useCredentialStore((state) => state.client)
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const authenticated = client?.authenticated ?? false

  const { id, currentNetworkId } = workspace

  const table = useTableStore((state) => state.tables[currentNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const viewModel = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const addMessage = useMessageStore((state) => state.addMessage)

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const saveCopyToNDEx = async (): Promise<void> => {
    setLoading(true)
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
      `Copy of ${summary.name}`,
    )
    try {
      const parsed = parsePathName(location.pathname)
      const { networkId } = parsed

      const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
      addNetworkToWorkspace(uuid as IdType)
      addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
        duration: 3000,
      })

      deleteNetwork(networkId)
      await waitSeconds(3)
      addNetworkIds(networkId)
      // await waitSeconds(3)
      setCurrentNetworkId(networkId)
      setLoading(false)
      props.onClose()

      navigate(`/${id}/networks/${networkId}${location.search.toString()}`)
    } catch (e) {
      setLoading(false)
      addMessage({
        message: `Error: Could not save a copy of the current network to NDEx. ${
          e.message as string
        }`,
        duration: 3000,
      })
    }
  }

  return (
    <Dialog
      onClose={() => {
        props.onClose()
      }}
      open={props.open}
    >
      <DialogTitle>Networks out of sync</DialogTitle>
      <DialogContent>
        <DialogContentText>
          The network you are trying to import is already in your workspace.
          Importing this network again may lose any changes you have made to
          your local copy. Would you like to save your network as a copy to
          NDEx?
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
          <Button
            disabled={!authenticated || loading}
            onClick={() => {
              saveCopyToNDEx().catch((e) => console.log(e))
            }}
          >
            Yes, create copy to NDEx
          </Button>
        )}
        <Button
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
