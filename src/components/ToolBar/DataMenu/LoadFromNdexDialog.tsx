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
  CircularProgress,
} from '@mui/material'
import { useCredentialStore } from '../../../store/CredentialStore'
import { formatBytes } from '../../../utils/byte-conversion'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { ndexSummaryFetcher } from '../../../store/hooks/useNdexNetworkSummary'
import { dateFormatter } from '../../../utils/date-format'
import { KeycloakContext } from '../../..'
import { useMessageStore } from '../../../store/MessageStore'

interface LoadFromNdexDialogProps {
  open: boolean
  handleClose: () => void
}

export const NetworkSeachField = (props: {
  startSearch: (searchValue: string) => Promise<void>
  handleClose: () => void
}): ReactElement => {
  const [searchValue, setSearchValue] = useState<string>('')

  // Execute search when enter key is pressed
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      void props.startSearch(searchValue)
    }

    if (event.key === 'Escape') {
      props.handleClose()
    }
  }
  return (
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
        onKeyDown={handleKeyDown}
      />
      <IconButton onClick={() => props.startSearch(searchValue)}>
        <Search />
      </IconButton>
    </Box>
  )
}

export const LoadFromNdexDialog = (
  props: LoadFromNdexDialogProps,
): ReactElement => {
  const { ndexBaseUrl, maxNetworkFileSize, maxNetworkElementsThreshold } =
    useContext(AppConfigContext)

  const client = useContext(KeycloakContext)

  const addMessage = useMessageStore((state) => state.addMessage)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
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
          throw err
        })
    } else {
      setMyNetworks([])
    }
  }, [authenticated])

  useEffect(() => {
    setLoading(true)
    fetchSearchResults('')
      .then(() => {
        setLoading(false)
      })
      .catch((err) => {
        setErrorMessage(err.message)
        setLoading(false)
        throw err
      })
  }, [])

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
                subnetworkIds,
              } = network
              const selected = selectedNetworks.includes(externalId)
              const networkAlreadyLoaded = networkIds.includes(externalId)
              const networkIsSmallEnough =
                +nodeCount + +edgeCount < maxNetworkElementsThreshold &&
                cx2FileSize < maxNetworkFileSize
              const networkCanBeSelected =
                !networkAlreadyLoaded &&
                networkIsSmallEnough &&
                subnetworkIds.length === 0

              const dateDisplay = dateFormatter(modificationTime)

              const cellSx = {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }

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
                  <TableCell
                    sx={{
                      maxWidth: 400,
                      ...cellSx,
                    }}
                  >
                    {name}
                  </TableCell>

                  <TableCell sx={{ maxWidth: 100, ...cellSx }}>
                    {owner}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 10, ...cellSx }}>
                    {nodeCount}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 10, ...cellSx }}>
                    {edgeCount}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 10, ...cellSx }}>
                    {dateDisplay}
                  </TableCell>
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
                  <TableCell
                    sx={{
                      maxWidth: 400,
                      ...cellSx,
                    }}
                  >
                    {name}
                  </TableCell>

                  <TableCell sx={{ maxWidth: 100, ...cellSx }}>
                    {owner}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 10, ...cellSx }}>
                    {nodeCount}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 10, ...cellSx }}>
                    {edgeCount}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 10, ...cellSx }}>
                    {dateDisplay}
                  </TableCell>
                </TableRow>
              )

              if (networkCanBeSelected) {
                return networkEntryRow
              } else {
                const tooltipMessage = networkAlreadyLoaded
                  ? 'Network already loaded in the workspace'
                  : subnetworkIds.length > 0
                    ? 'Collections cannot be imported into Cytoscape Web'
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
            {myNetworksTab}
          </Tabs>
        </Box>
        {currentTabIndex === 0 && (
          <NetworkSeachField
            startSearch={fetchSearchResults}
            handleClose={props.handleClose}
          />
        )}
        {loading ? <CircularProgress /> : null}
        {content}
      </DialogContent>
      <DialogActions
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ pl: 2 }}>{successMessage ?? errorMessage ?? ''}</Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button color="error" onClick={handleClose} sx={{ mr: 7 }}>
            Cancel
          </Button>
          <Button
            disabled={selectedNetworks.length === 0}
            onClick={() => {
              setErrorMessage(undefined)
              setSuccessMessage(undefined)
              addMessage({
                message: `Loading ${selectedNetworks.length} network(s) from NDEx`,
                duration: 3000,
              })
              void addNDExNetworksToWorkspace(selectedNetworks)
              handleClose()
            }}
          >
            {`Open ${selectedNetworks.length} Network(s)`}
          </Button>
          {/* </Box> */}
        </Box>
      </DialogActions>
    </Dialog>
  )
}
