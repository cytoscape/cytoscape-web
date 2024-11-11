import DialogTitle from '@mui/material/DialogTitle'
import { ReactElement, useState, useContext, useEffect } from 'react'
import { AppConfigContext } from '../../../../AppConfigContext'
import { IdType } from '../../../../models/IdType'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import {
  Box,
  Typography,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogContent,
} from '@mui/material'
import { useCredentialStore } from '../../../../store/CredentialStore'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import { ndexSummaryFetcher } from '../../../../store/hooks/useNdexNetworkSummary'
import { KeycloakContext } from '../../../../bootstrap'
import { useMessageStore } from '../../../../store/MessageStore'
import NetworkTable from './NetworkTable.tsx'
import LoadFromNdexDialogFooter from './LoadFromNdexDialogFooter'
import { NetworkSeachField } from './NetworkSearchField'

interface LoadFromNdexDialogProps {
  open: boolean
  handleClose: () => void
}

const LoadFromNdexDialog = (
  props: LoadFromNdexDialogProps,
): ReactElement => {
  const { open, handleClose } = props
  const { ndexBaseUrl, maxNetworkFileSize, maxNetworkElementsThreshold } =
    useContext(AppConfigContext)
  const client = useContext(KeycloakContext)

  const addMessage = useMessageStore((state) => state.addMessage)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addNetworks = useWorkspaceStore((state) => state.addNetworkIds)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)

  const [currentTabIndex, setCurrentTabIndex] = useState<number>(
    authenticated ? 1 : 0,
  )
  const [myNetworks, setMyNetworks] = useState<any[]>([])
  const [searchResultNetworks, setSearchResultNetworks] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [successMessage, setSuccessMessage] = useState<string>()
  const [selectedNetworks, setSelectedNetworks] = useState<IdType[]>([])

  const handleImportNetworks = () => {
    setErrorMessage(undefined)
    setSuccessMessage(undefined)
    addMessage({
      message: `Loading ${selectedNetworks.length} network(s) from NDEx`,
      duration: 3000,
    })
    void addNDExNetworksToWorkspace(selectedNetworks)
    handleClose()
  }

  const toggleSelectedNetwork = (networkId: IdType) => {
    setSelectedNetworks(
      selectedNetworks.includes(networkId)
        ? selectedNetworks.filter((id) => id !== networkId)
        : [...selectedNetworks, networkId]
    )
  }

  const addNDExNetworksToWorkspace = async (
    networkIds: IdType[],
  ): Promise<void> => {
    try {
      const token = await getToken()
      const summaries = await ndexSummaryFetcher(networkIds, ndexBaseUrl, token)

      const invalidNetworkIds: IdType[] = []
      const validNetworkIds: IdType[] = []

      summaries.forEach((summary) => {
        if (summary !== undefined) {
          const networkSizeTooLarge = summary.cx2FileSize > maxNetworkFileSize
          const tooManyNetworkElements =
            summary.nodeCount + summary.edgeCount > maxNetworkElementsThreshold
          if (networkSizeTooLarge || tooManyNetworkElements) {
            invalidNetworkIds.push(summary.externalId)
          } else {
            validNetworkIds.push(summary.externalId)
          }
        }
      })
      console.log('Valid networks', validNetworkIds)
      console.log('Invalid networks', invalidNetworkIds)
      addNetworks(validNetworkIds)
      const nextCurrentNetworkId: IdType | undefined = validNetworkIds[0]

      if (nextCurrentNetworkId !== undefined) {
        setCurrentNetworkId(nextCurrentNetworkId)
      }

      setSuccessMessage(`${validNetworkIds.length} network(s) loaded`)

      setSelectedNetworks([])
    } catch (e) {
      setErrorMessage(e.message)
    }
  }

  useEffect(() => {
    const fetchMyNetworks = async (): Promise<any> => {
      const ndexClient = new NDEx(ndexBaseUrl)
      const token = await getToken()
      ndexClient.setAuthToken(token)
      const myNetworks = await ndexClient.getAccountPageNetworks(0, 1000)
      return myNetworks
    }
    if (authenticated) {
      setLoading(true)
      fetchMyNetworks()
        .then((networks) => {
          setMyNetworks(networks)
          setLoading(false)
        })
        .catch((err) => {
          setErrorMessage(err.message)
          setLoading(false)
        })
    } else {
      setMyNetworks([])
    }
  }, [authenticated])

  useEffect(() => {
    if (!open) {
      return
    }

    setLoading(true)
    fetchSearchResults('')
      .then(() => {
        setLoading(false)
      })
      .catch((err) => {
        setErrorMessage(err.message)
        setLoading(false)
      })
  }, [open])

  const fetchSearchResults = async (searchValue: string): Promise<void> => {
    setLoading(true)
    const ndexClient = new NDEx(ndexBaseUrl)

    if (authenticated) {
      const token = await getToken()
      ndexClient.setAuthToken(token)
    }
    const searchResults = await ndexClient.searchNetworks(searchValue, 0, 1000)
    setSearchResultNetworks(searchResults?.networks ?? [])
    setLoading(false)
  }

  return (
    <Dialog
      onKeyDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      PaperProps={{
        sx: {
          minHeight: 600,
        },
      }}
      fullWidth={true}
      maxWidth="lg"
      open={open}
      onClose={handleClose}
    >
      <DialogTitle>NDEx - Network Browser</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTabIndex}
            onChange={(e, val) => setCurrentTabIndex(val)}
          >
            <Tab
              sx={{ textTransform: 'none' }}
              label={<Typography>SEARCH NDEx</Typography>}
            />
            {authenticated ? (
              <Tab label={<Typography>My Networks</Typography>} />
            ) : (
              <Tooltip title="Login to NDEx to access your networks">
                <Box>
                  <Tab disabled label={<Typography>My Networks</Typography>} />
                </Box>
              </Tooltip>
            )}
          </Tabs>
        </Box>
        {currentTabIndex === 0 && (
          <NetworkSeachField
            startSearch={fetchSearchResults}
            handleClose={handleClose}
          />
        )}
        {loading ? (
          <CircularProgress />
        ) : errorMessage ? (
          <Typography>{errorMessage}</Typography>
        ) : (currentTabIndex === 0 ? searchResultNetworks : myNetworks).length === 0 ? (
          <Typography>
            {currentTabIndex === 0
              ? 'No search results'
              : 'No networks found in your NDEx account'}
          </Typography>
        ) : (
          <NetworkTable
            networks={currentTabIndex === 0 ? searchResultNetworks : myNetworks}
            selectedNetworks={selectedNetworks}
            networkIds={networkIds}
            maxNetworkFileSize={maxNetworkFileSize}
            maxNetworkElementsThreshold={maxNetworkElementsThreshold}
            onToggleSelect={toggleSelectedNetwork}
          />
        )}
      </DialogContent>
      <LoadFromNdexDialogFooter
        selectedNetworks={selectedNetworks}
        successMessage={successMessage}
        errorMessage={errorMessage}
        onClose={handleClose}
        onImport={handleImportNetworks}
      />
    </Dialog>
  )
}

export default LoadFromNdexDialog;