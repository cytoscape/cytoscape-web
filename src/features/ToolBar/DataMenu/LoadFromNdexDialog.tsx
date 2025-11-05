import Search from '@mui/icons-material/Search'
import {
  Box,
  Checkbox,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import { ReactElement, useContext, useEffect,useState } from 'react'

import {
  fetchMyNdexAccountNetworks,
  fetchNdexSummaries,
  searchNdexNetworks,
} from '../../../api/ndex'
import { AppConfigContext } from '../../../AppConfigContext'
import { logUi } from '../../../debug'
import { useUrlNavigation } from '../../../hooks/navigation/useUrlNavigation'
import { useCredentialStore } from '../../../hooks/stores/CredentialStore'
import { useMessageStore } from '../../../hooks/stores/MessageStore'
import { useNetworkSummaryStore } from '../../../hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { KeycloakContext } from '../../../init/keycloak'
import { IdType } from '../../../models/IdType'
import { MessageSeverity } from '../../../models/MessageModel'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { dateFormatter } from '../../../utils/date-format'

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
  const { open, handleClose } = props

  const {
    ndexBaseUrl,
    maxNetworkFileSize,
    maxNetworkElementsThreshold,
    maxEdgeCountThreshold,
  } = useContext(AppConfigContext)

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
  const workspace = useWorkspaceStore((state) => state.workspace)
  const { navigateToNetwork } = useUrlNavigation()
  const addSummaries = useNetworkSummaryStore((state) => state.addAll)

  const networkListData =
    currentTabIndex === 0 ? searchResultNetworks : myNetworks
  const emptyListMessage =
    currentTabIndex === 0
      ? 'No search results'
      : 'No networks found in your NDEx account'

  const myNetworksTab = authenticated ? (
    <Tab label={<Typography>My Networks</Typography>}></Tab>
  ) : (
    <Tooltip
      arrow
      placement="right"
      title="Login to NDEx to access your networks"
    >
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

  const networkPassesSizeThreshold = (
    nodeCount: number,
    edgeCount: number,
    cx2FileSize: number,
  ): boolean => {
    return (
      edgeCount <= maxEdgeCountThreshold ||
      (+nodeCount + +edgeCount < maxNetworkElementsThreshold &&
        cx2FileSize < maxNetworkFileSize)
    )
  }

  const addNDExNetworksToWorkspace = async (
    networkIds: IdType[],
  ): Promise<void> => {
    try {
      const token = await getToken()
      const summaries = await fetchNdexSummaries(networkIds, token)
      const invalidNetworkIds: IdType[] = []
      const validNetworkIds: IdType[] = []

      summaries.forEach((summary) => {
        if (summary !== undefined) {
          const networkCanBeSelected = networkPassesSizeThreshold(
            summary.nodeCount,
            summary.edgeCount,
            summary.cx2FileSize,
          )

          if (!networkCanBeSelected) {
            invalidNetworkIds.push(summary.externalId)
          } else {
            validNetworkIds.push(summary.externalId)
          }
        }
      })

      const failedToLoadNetworks = networkIds.filter(
        (id) =>
          !validNetworkIds.includes(id) && !invalidNetworkIds.includes(id),
      )

      logUi.info(
        `[${LoadFromNdexDialog.name}]:[${addNDExNetworksToWorkspace.name}]: Valid networks`,
        validNetworkIds,
      )
      logUi.info(
        `[${LoadFromNdexDialog.name}]:[${addNDExNetworksToWorkspace.name}]: Invalid networks`,
        invalidNetworkIds,
      )
      addNetworks(validNetworkIds)
      addSummaries(
        summaries.reduce(
          (acc, summary) => {
            acc[summary.externalId] = summary
            return acc
          },
          {} as Record<IdType, NetworkSummary>,
        ),
      )
      const nextCurrentNetworkId: IdType | undefined = validNetworkIds[0]

      if (nextCurrentNetworkId !== undefined) {
        setCurrentNetworkId(nextCurrentNetworkId)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: nextCurrentNetworkId,
          searchParams: new URLSearchParams(location.search),
          replace: false,
        })
      }

      setSuccessMessage(`${validNetworkIds.length} network(s) loaded`)
      if (failedToLoadNetworks.length > 0) {
        addMessage({
          // show a message to the user
          message: `Failed to load ${failedToLoadNetworks.length} network${failedToLoadNetworks.length > 1 ? 's' : ''} with id${failedToLoadNetworks.length > 1 ? 's' : ''}: ${
            failedToLoadNetworks.length > 1
              ? failedToLoadNetworks.slice(0, 3).join(', ') + '...'
              : failedToLoadNetworks.join(', ')
          }`,
          duration: 5000,
          severity: MessageSeverity.ERROR,
        })
      }

      setSelectedNetworks([])
    } catch (e) {
      setErrorMessage(e.message)
    }
  }

  useEffect(() => {
    const fetchMyNetworks = async (): Promise<any> => {
      const token = await getToken()
      const myNetworks = await fetchMyNdexAccountNetworks(
        token,
        0,
        1000,
        ndexBaseUrl,
      )
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
  }, [authenticated, ndexBaseUrl, getToken])

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

    try {
      const token = authenticated ? await getToken() : undefined
      const searchResults = await searchNdexNetworks(
        searchValue,
        token,
        0,
        1000,
        ndexBaseUrl,
      )
      setSearchResultNetworks(searchResults?.networks ?? [])
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
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

              // Ensure subnetworkIds is defined and is an array
              let { subnetworkIds } = network
              if (subnetworkIds === undefined) {
                subnetworkIds = []
              }

              const selected = selectedNetworks.includes(externalId)
              const networkAlreadyLoaded = networkIds.includes(externalId)
              const networkCanBeSelected =
                !networkAlreadyLoaded &&
                networkPassesSizeThreshold(
                  +nodeCount,
                  +edgeCount,
                  cx2FileSize,
                ) &&
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
                    : `Networks is too large to be loaded into Cytoscape Web.`

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
          <Button color="primary" onClick={handleClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            sx={{
              color: '#FFFFFF',
              backgroundColor: '#337ab7',
              '&:hover': {
                backgroundColor: '#285a9b',
              },
              '&:disabled': {
                backgroundColor: 'transparent',
              },
            }}
            disabled={selectedNetworks.length === 0}
            onClick={() => {
              setErrorMessage(undefined)
              setSuccessMessage(undefined)
              addMessage({
                message: `Loading ${selectedNetworks.length} network${selectedNetworks.length > 1 ? 's' : ''} from NDEx`,
                duration: 3000,
                severity: MessageSeverity.INFO,
              })
              void addNDExNetworksToWorkspace(selectedNetworks)
              handleClose()
            }}
          >
            {`Open ${selectedNetworks.length} Network${selectedNetworks.length > 1 ? 's' : ''}`}
          </Button>
          {/* </Box> */}
        </Box>
      </DialogActions>
    </Dialog>
  )
}
