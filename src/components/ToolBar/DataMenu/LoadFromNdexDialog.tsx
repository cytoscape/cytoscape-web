import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { ReactElement, useState, useContext, useEffect } from 'react'
import { AppConfigContext } from '../../../AppConfigContext'
import { IdType } from '../../../models/IdType'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Search from '@mui/icons-material/Search'
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
} from '@mui/material'
import { useCredentialStore } from '../../../store/CredentialStore'
import { formatBytes } from '../../../utils/byte-conversion'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { networkSummaryFetcher } from '../../../store/useNdexNetworkSummary'
import { dateFormatter } from '../../../utils/date-format'

interface LoadFromNdexDialogProps {
  open: boolean
  handleClose: () => void
}
export const LoadFromNdexDialog = (
  props: LoadFromNdexDialogProps,
): ReactElement => {
  const { ndexBaseUrl, maxNetworkFileSize, maxNetworkElementsThreshold } =
    useContext(AppConfigContext)

  const client = useCredentialStore((state) => state.client)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)

  const [searchValue, setSearchValue] = useState<string>('')
  const [currentTabIndex, setCurrentTabIndex] = useState<number>(
    authenticated ? 1 : 0,
  )
  const [myNetworks, setMyNetworks] = useState<any[]>([])
  const [searchResultNetworks, setSearchResultNetworks] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  )
  const [successMessage, setSuccessMessage] = useState<string | undefined>(
    undefined,
  )
  const [selectedNetworks, setSelectedNetworks] = useState<IdType[]>([])

  const networkListData =
    currentTabIndex === 0 ? searchResultNetworks : myNetworks
  const emptyListMessage =
    currentTabIndex === 0
      ? 'No search results'
      : 'No networks found in your NDEx account'

  const myNetworksTab = authenticated ? (
    <Tab label={<Typography>My Networks</Typography>}></Tab>
  ) : (
    <Tooltip title="Login to NDEx to access your networks">
      <Box>
        <Tab disabled label={<Typography>My Networks</Typography>}></Tab>
      </Box>
    </Tooltip>
  )

  const toggleSelectedNetwork = (networkId: IdType): void => {
    if (selectedNetworks.includes(networkId)) {
      setSelectedNetworks(selectedNetworks.filter((id) => id !== networkId))
    } else {
      setSelectedNetworks([...selectedNetworks, networkId])
    }
  }

  const addNDExNetworksToWorkspace = async (
    networkIds: IdType[],
  ): Promise<void> => {
    try {
      const token = await getToken()
      const summaries = await networkSummaryFetcher(
        networkIds,
        ndexBaseUrl,
        token,
      )

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
      const myNetworks = await ndexClient.getAccountPageNetworks(0, 400)
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
          throw err
        })
    } else {
      setMyNetworks([])
    }
  }, [authenticated])

  useEffect(() => {
    setLoading(true)
    fetchSearchResults()
      .then(() => {
        setLoading(false)
      })
      .catch((err) => {
        setErrorMessage(err.message)
        setLoading(false)
        throw err
      })
  }, [])

  const fetchSearchResults = async (): Promise<any> => {
    const ndexClient = new NDEx(ndexBaseUrl)

    if (authenticated) {
      const token = await getToken()
      ndexClient.setAuthToken(token)
    }
    const searchResults = await ndexClient.searchNetworks(searchValue, 0, 400)
    setSearchResultNetworks(searchResults?.networks ?? [])
  }

  const errorMessageContent = <Typography>{errorMessage}</Typography>
  const loadingContent = <Typography>Loading...</Typography>
  const emptyListMessageContent = <Typography>{emptyListMessage}</Typography>
  const networksToRender =
    currentTabIndex === 0 ? searchResultNetworks : myNetworks
  const networkListContent = (
    <Box>
      <TableContainer sx={{ height: 460 }}>
        <Table size={'small'} stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"></TableCell>
              <TableCell>Network</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Nodes</TableCell>
              <TableCell>Edges</TableCell>
              <TableCell>Last modified</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {networksToRender.map((network) => {
              const {
                externalId,
                name,
                owner,
                nodeCount,
                edgeCount,
                modificationTime,
                cx2FileSize,
              } = network
              const selected = selectedNetworks.includes(externalId)
              const networkAlreadyLoaded = networkIds.includes(externalId)
              const networkIsSmallEnough =
                +nodeCount + +edgeCount < maxNetworkElementsThreshold &&
                cx2FileSize < maxNetworkFileSize
              const networkCanBeSelected =
                !networkAlreadyLoaded && networkIsSmallEnough

              const dateDisplay = dateFormatter(modificationTime)

              const disabledNetworkEntryRow = (
                <TableRow
                  sx={{
                    backgroundColor: '#d9d9d9',
                    cursor: 'not-allowed',
                  }}
                  key={externalId}
                  hover={false}
                  selected={false}
                >
                  <TableCell padding="checkbox">
                    <Checkbox disabled={true} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{name}</TableCell>

                  <TableCell>{owner}</TableCell>
                  <TableCell>{nodeCount}</TableCell>
                  <TableCell>{edgeCount}</TableCell>
                  <TableCell>{dateDisplay}</TableCell>
                </TableRow>
              )

              const networkEntryRow = (
                <TableRow
                  sx={{ cursor: 'pointer' }}
                  key={externalId}
                  hover={true}
                  selected={selected}
                  onClick={() => toggleSelectedNetwork(externalId)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      onClick={() => toggleSelectedNetwork(externalId)}
                      checked={selected}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{name}</TableCell>

                  <TableCell>{owner}</TableCell>
                  <TableCell>{nodeCount}</TableCell>
                  <TableCell>{edgeCount}</TableCell>
                  <TableCell>{dateDisplay}</TableCell>
                </TableRow>
              )

              if (networkCanBeSelected) {
                return networkEntryRow
              } else {
                const tooltipMessage = networkAlreadyLoaded
                  ? 'Network already loaded in the workspace'
                  : `Networks must be smaller than ${formatBytes(
                      maxNetworkFileSize,
                    )} and contain less than ${maxNetworkElementsThreshold} nodes/edges.`

                return (
                  <Tooltip key={externalId} title={tooltipMessage}>
                    {disabledNetworkEntryRow}
                  </Tooltip>
                )
              }
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
  const content =
    (errorMessage ?? '') !== ''
      ? errorMessageContent
      : loading
      ? loadingContent
      : networkListData.length === 0
      ? emptyListMessageContent
      : networkListContent

  const { open, handleClose } = props
  return (
    <Dialog
      PaperProps={{
        sx: {
          minHeight: 600,
        },
      }}
      fullWidth={true}
      maxWidth="md"
      open={open}
      onClose={handleClose}
    >
      <DialogTitle>Open Networks from NDEx: {ndexBaseUrl}</DialogTitle>
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
            {myNetworksTab}
          </Tabs>
        </Box>
        {currentTabIndex === 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'end',
            }}
          >
            <TextField
              autoFocus
              margin="dense"
              label="Search NDEx"
              type="text"
              fullWidth
              variant="standard"
              onChange={(e) => setSearchValue(e.target.value)}
              value={searchValue}
            />
            <IconButton onClick={() => fetchSearchResults()}>
              <Search />
            </IconButton>
          </Box>
        )}
        {content}
      </DialogContent>
      <DialogActions>
        {successMessage ?? errorMessage}
        <Button onClick={handleClose}>Done</Button>
        <Button
          disabled={selectedNetworks.length === 0}
          onClick={() => {
            setErrorMessage(undefined)
            setSuccessMessage(undefined)
            void addNDExNetworksToWorkspace(selectedNetworks)
          }}
        >
          {`Open ${selectedNetworks.length} Network(s) from NDEx`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
