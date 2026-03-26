import ChevronRight from '@mui/icons-material/ChevronRight'
import FolderIcon from '@mui/icons-material/Folder'
import Home from '@mui/icons-material/Home'
import LockIcon from '@mui/icons-material/Lock'
import PublicIcon from '@mui/icons-material/Public'
import Search from '@mui/icons-material/Search'
import {
  Box,
  Breadcrumbs,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Link as MuiLink,
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
import { ReactElement, useContext, useEffect, useMemo, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import {
  fetchFolderContents,
  fetchFolderInfo,
  fetchNdexSummaries,
  searchNdexFiles,
} from '../../../data/external-api/ndex'
import { NdexFileItem } from '../../../data/external-api/ndex/files'
import { useUrlNavigation } from '../../../data/hooks/navigation/useUrlNavigation'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../../debug'
import { KeycloakContext } from '../../../init/keycloak'
import { IdType } from '../../../models/IdType'
import { MessageSeverity } from '../../../models/MessageModel'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { dateFormatter } from '../../../utils/dateFormat'

interface LoadFromNdexDialogProps {
  open: boolean
  handleClose: () => void
}

interface BreadcrumbItem {
  name: string
  id: string | null
}

// Tabs for logged-in users
type SignedInTab = 'my-networks' | 'public' | 'private'

/**
 * Split file items into folders and networks.
 * Shortcuts to folders go into the folders group.
 */
const splitByType = (
  items: NdexFileItem[],
): { folders: NdexFileItem[]; networks: NdexFileItem[] } => {
  const folders: NdexFileItem[] = []
  const networks: NdexFileItem[] = []
  for (const item of items) {
    if (
      item.type === 'FOLDER' ||
      (item.type === 'SHORTCUT' &&
        item.attributes?.target_type === 'FOLDER')
    ) {
      folders.push(item)
    } else {
      networks.push(item)
    }
  }
  return { folders, networks }
}

export const NetworkSearchField = (props: {
  startSearch: (searchValue: string) => Promise<void>
  handleClose: () => void
  searchValue: string
  onSearchValueChange: (value: string) => void
}): ReactElement => {
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      void props.startSearch(props.searchValue)
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
        mb: 1,
      }}
    >
      <TextField
        data-testid="load-from-ndex-search-input"
        autoFocus
        margin="dense"
        label="Search NDEx"
        type="text"
        fullWidth
        variant="standard"
        onChange={(e) => props.onSearchValueChange(e.target.value)}
        value={props.searchValue}
        onKeyDown={handleKeyDown}
      />
      <IconButton
        data-testid="load-from-ndex-search-button"
        onClick={() => props.startSearch(props.searchValue)}
      >
        <Search />
      </IconButton>
    </Box>
  )
}

/**
 * Breadcrumb navigation for folder drill-in.
 */
const FolderBreadcrumbs = (props: {
  path: BreadcrumbItem[]
  onNavigate: (folderId: string | null) => void
  hasError?: boolean
}): ReactElement | null => {
  const { path, onNavigate, hasError } = props
  if (path.length === 0) return null

  return (
    <Breadcrumbs
      separator={<ChevronRight fontSize="small" />}
      sx={{ mb: 1, mt: 1 }}
    >
      {path.map((item, index) => {
        const isLast = index === path.length - 1
        
        let icon: ReactElement | null = null
        if (index === 0) {
          if (item.name.includes('My Drive')) {
            icon = <Home fontSize="small" />
          } else if (item.name.includes('Latest Networks')) {
            icon = <PublicIcon fontSize="small" />
          } else if (item.name.includes('Private Networks')) {
            icon = <LockIcon fontSize="small" />
          } else if (item.name.startsWith('Search:')) {
            icon = <Search fontSize="small" />
          }
        }
        
        const content = (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {icon}
            {item.name}
          </Box>
        )

        return isLast && !hasError ? (
          <Typography
            key={index}
            color="text.primary"
            variant="body2"
            fontWeight="bold"
          >
            {content}
          </Typography>
        ) : (
          <MuiLink
            key={index}
            component="button"
            variant="body2"
            underline="hover"
            onClick={() => onNavigate(item.id)}
            sx={{ cursor: 'pointer' }}
          >
            {content}
          </MuiLink>
        )
      })}
    </Breadcrumbs>
  )
}

/**
 * Renders the folder rows section header and rows.
 */
const FolderSection = (props: {
  folders: NdexFileItem[]
  onFolderClick: (folderId: string) => void
}): ReactElement | null => {
  const { folders, onFolderClick } = props
  if (folders.length === 0) return null

  const cellSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  return (
    <>
      <TableRow>
        <TableCell
          colSpan={7}
          sx={{ backgroundColor: '#f5f5f5', py: 0.5 }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Folders
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow sx={{ backgroundColor: '#fafafa' }}>
        <TableCell padding="checkbox" />
        <TableCell>
          <Typography variant="caption" fontWeight="bold">
            Name
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption" fontWeight="bold">
            Owner
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption" fontWeight="bold">
            Visibility
          </Typography>
        </TableCell>
        <TableCell colSpan={2} />
        <TableCell>
          <Typography variant="caption" fontWeight="bold">
            Last modified
          </Typography>
        </TableCell>
      </TableRow>
      {folders.map((folder) => (
        <TableRow
          key={folder.uuid}
          sx={{
            cursor: 'pointer',
            '&:hover': { backgroundColor: '#e3f2fd' },
          }}
          hover
          onClick={() => onFolderClick(folder.uuid)}
        >
          <TableCell padding="checkbox" />
          <TableCell sx={{ maxWidth: 400, ...cellSx }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderIcon
                fontSize="small"
                sx={{ color: '#90a4ae' }}
              />
              {folder.name}
            </Box>
          </TableCell>
          <TableCell sx={{ maxWidth: 100, ...cellSx }}>
            {folder.owner ?? ''}
          </TableCell>
          <TableCell sx={{ maxWidth: 50, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
              {folder.visibility}
            </Typography>
          </TableCell>
          <TableCell colSpan={2} />
          <TableCell sx={{ maxWidth: 10, ...cellSx }}>
            {dateFormatter(folder.modificationTime)}
          </TableCell>
        </TableRow>
      ))}
    </>
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

  // UI state
  const [activeTab, setActiveTab] = useState<SignedInTab>('my-networks')
  const [searchValue, setSearchValue] = useState<string>('')
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('')
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

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    null,
  )
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([
    { name: 'My Drive', id: null },
  ])
  const [folderContents, setFolderContents] = useState<NdexFileItem[]>([])

  // Search results state per tab
  const [myNetworksResults, setMyNetworksResults] = useState<
    NdexFileItem[]
  >([])
  const [myNetworksCount, setMyNetworksCount] = useState<number>(0)
  const [publicResults, setPublicResults] = useState<NdexFileItem[]>([])
  const [publicCount, setPublicCount] = useState<number>(0)
  const [privateResults, setPrivateResults] = useState<NdexFileItem[]>([])
  const [privateCount, setPrivateCount] = useState<number>(0)

  // Whether we're in folder browse mode (no search query) or search mode
  const isBrowseMode = lastSearchQuery === ''

  // Current items to display
  const displayItems = useMemo(() => {
    if (currentFolderId !== null) {
      return folderContents
    }
    if (isBrowseMode && activeTab === 'my-networks') {
      return folderContents
    }
    if (activeTab === 'my-networks') return myNetworksResults
    if (activeTab === 'public') return publicResults
    return privateResults
  }, [
    isBrowseMode,
    activeTab,
    folderContents,
    myNetworksResults,
    publicResults,
    privateResults,
    currentFolderId,
  ])

  const { folders, networks } = useMemo(
    () => splitByType(displayItems),
    [displayItems],
  )

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
      const summaries = await fetchNdexSummaries(networkIds, token)
      addNetworks(summaries.map((summary) => summary.externalId))
      addSummaries(
        summaries.reduce(
          (acc, summary) => {
            acc[summary.externalId] = summary
            return acc
          },
          {} as Record<IdType, NetworkSummary>,
        ),
      )
      const nextCurrentNetworkId: IdType | undefined =
        summaries[0]?.externalId

      if (nextCurrentNetworkId !== undefined) {
        setCurrentNetworkId(nextCurrentNetworkId)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: nextCurrentNetworkId,
          searchParams: new URLSearchParams(location.search),
          replace: false,
        })
      }

      setSuccessMessage(`${summaries.length} network(s) loaded`)
      setSelectedNetworks([])
    } catch (e) {
      setErrorMessage(e.message)
    }
  }

  // Load home folder contents on dialog open (for My Networks tab default)
  useEffect(() => {
    if (!open || !authenticated) return

    const loadHomeFolder = async (): Promise<void> => {
      setLoading(true)
      try {
        const token = await getToken()
        const items = await fetchFolderContents(null, token, ndexBaseUrl)
        setFolderContents(items)
        setCurrentFolderId(null)
        setBreadcrumbPath([{ name: 'My Drive', id: null }])
      } catch (err: any) {
        logUi.error('Failed to load home folder', err)
        setErrorMessage(err.message)
      } finally {
        setLoading(false)
      }
    }
    void loadHomeFolder()
  }, [open, authenticated, getToken, ndexBaseUrl])

  // Navigate into a folder
  const navigateToFolder = async (folderId: string): Promise<void> => {
    setLoading(true)
    setErrorMessage(undefined)
    try {
      const token = await getToken()
      const [items, info] = await Promise.all([
        fetchFolderContents(folderId, token, ndexBaseUrl),
        fetchFolderInfo(folderId, token, ndexBaseUrl),
      ])
      setFolderContents(items)
      setCurrentFolderId(folderId)

      // Build breadcrumb — add to current path
      setBreadcrumbPath((prev) => [
        ...prev,
        { name: info.name, id: folderId },
      ])
    } catch (err: any) {
      logUi.error('Failed to navigate to folder', err)
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBreadcrumbNavigate = async (
    folderId: string | null,
  ): Promise<void> => {
    if (folderId === null) {
      setCurrentFolderId(null)
      setBreadcrumbPath((prev) => [prev[0]])
      // If we are just browsing 'My Networks', we MUST still fetch the real Home folder contents (folderId=null).
      // Otherwise, we jump directly back to our pre-fetched search results cache for Public/Private results.
      if (!isBrowseMode || activeTab !== 'my-networks') {
        return
      }
    }

    setLoading(true)
    setErrorMessage(undefined)
    try {
      const token = await getToken()
      const items = await fetchFolderContents(
        folderId,
        token,
        ndexBaseUrl,
      )
      setFolderContents(items)
      setCurrentFolderId(folderId)

      // Trim breadcrumb path to the clicked item
      setBreadcrumbPath((prev) => {
        const idx = prev.findIndex((item) => item.id === folderId)
        return idx >= 0 ? prev.slice(0, idx + 1) : prev
      })
    } catch (err: any) {
      logUi.error('Failed to navigate via breadcrumb', err)
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Execute search across all tabs
  const executeSearch = async (query: string): Promise<void> => {
    const trimmedQuery = query.trim()
    setLastSearchQuery(trimmedQuery)
    setErrorMessage(undefined)
    
    // Properly title the search results root node
    setBreadcrumbPath([
      {
        name: trimmedQuery
          ? `Search: "${trimmedQuery}"`
          : activeTab === 'my-networks'
          ? 'My Drive'
          : activeTab === 'private'
          ? 'Private Networks'
          : 'Latest Networks',
        id: null,
      },
    ])

    setLoading(true)
    try {
      const token = authenticated ? await getToken() : undefined
      const userName = client?.tokenParsed?.preferred_username

      // Fire search requests in parallel
      const promises: Promise<any>[] = []

      if (authenticated && userName) {
        // My Networks: public + private owned by me
        promises.push(
          Promise.all([
            searchNdexFiles(
              query,
              'PUBLIC',
              token,
              userName,
              0,
              1000,
              ndexBaseUrl,
            ),
            searchNdexFiles(
              query,
              'PRIVATE',
              token,
              userName,
              0,
              1000,
              ndexBaseUrl,
            ),
          ]).then(([pub, priv]) => {
            const merged = [...pub.files, ...priv.files].sort(
              (a, b) => {
                const timeA =
                  typeof a.modificationTime === 'number'
                    ? a.modificationTime
                    : new Date(a.modificationTime).getTime()
                const timeB =
                  typeof b.modificationTime === 'number'
                    ? b.modificationTime
                    : new Date(b.modificationTime).getTime()
                return timeB - timeA
              },
            )
            setMyNetworksResults(merged)
            setMyNetworksCount(pub.numFound + priv.numFound)
          }),
        )

        // Private & Unlisted tab
        promises.push(
          searchNdexFiles(
            query,
            'PRIVATE',
            token,
            undefined,
            0,
            500,
            ndexBaseUrl,
          ).then((result) => {
            setPrivateResults(result.files)
            setPrivateCount(result.numFound)
          }),
        )
      }

      // Public tab (always available)
      promises.push(
        searchNdexFiles(
          query,
          'PUBLIC',
          token,
          undefined,
          0,
          500,
          ndexBaseUrl,
        ).then((result) => {
          setPublicResults(result.files)
          setPublicCount(result.numFound)
        }),
      )

      const results = await Promise.allSettled(promises)
      const rejected = results.filter(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult[]
      if (rejected.length > 0) {
        setErrorMessage(
          rejected[0].reason?.message || 'Failed to search NDEx',
        )
      }
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle folder click (works in both browse and search mode)
  const handleFolderClick = (folderId: string): void => {
    void navigateToFolder(folderId)
  }

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Unconditionally fetch latest global networks to populate the tabs natively under the legacy NDEx browse model.
      void executeSearch('')
    } else {
      setSearchValue('')
      setLastSearchQuery('')
      setSelectedNetworks([])
      setErrorMessage(undefined)
      setSuccessMessage(undefined)
      setCurrentFolderId(null)
      setBreadcrumbPath([{ name: 'My Drive', id: null }])
      setMyNetworksResults([])
      setPublicResults([])
      setPrivateResults([])
      setActiveTab('my-networks')
    }
  }, [open])

  // Set initial tab based on auth
  useEffect(() => {
    if (!authenticated && open) {
      setActiveTab('public')
    } else if (authenticated && open) {
      setActiveTab('my-networks')
    }
  }, [authenticated, open])

  const cellSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  const emptyMessage = isBrowseMode
    ? 'No items in this folder'
    : 'No search results'

  const renderNetworkRows = (): ReactElement[] => {
    return networks.map((network) => {
      const {
        uuid: externalId,
        name,
        owner,
        edges: edgeCount,
        modificationTime,
      } = network

      const nodeCount = (network.attributes as any)?.nodeCount ?? 0
      const cx2FileSize = (network.attributes as any)?.cx2FileSize ?? 0
      const subnetworkIds = (network.attributes as any)?.subnetworkIds ?? []

      const selected = selectedNetworks.includes(externalId)
      const networkAlreadyLoaded = networkIds.includes(externalId)
      const networkCanBeSelected =
        !networkAlreadyLoaded &&
        networkPassesSizeThreshold(
          +nodeCount,
          +(edgeCount ?? 0),
          cx2FileSize,
        ) &&
        subnetworkIds.length === 0

      const dateDisplay = dateFormatter(modificationTime)

      if (networkCanBeSelected) {
        return (
          <TableRow
            sx={{ cursor: 'pointer' }}
            key={externalId}
            hover
            selected={selected}
            onClick={() => toggleSelectedNetwork(externalId)}
          >
            <TableCell padding="checkbox">
              <Checkbox
                data-testid={`load-from-ndex-network-checkbox-${externalId}`}
                onClick={() => toggleSelectedNetwork(externalId)}
                checked={selected}
              />
            </TableCell>
            <TableCell sx={{ maxWidth: 400, ...cellSx }}>
              {name}
            </TableCell>
            <TableCell sx={{ maxWidth: 100, ...cellSx }}>
              {owner ?? ''}
            </TableCell>
            <TableCell sx={{ maxWidth: 50, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                {network.visibility}
              </Typography>
            </TableCell>
            <TableCell sx={{ maxWidth: 10, ...cellSx }}>
              {nodeCount}
            </TableCell>
            <TableCell sx={{ maxWidth: 10, ...cellSx }}>
              {edgeCount ?? 0}
            </TableCell>
            <TableCell sx={{ maxWidth: 10, ...cellSx }}>
              {dateDisplay}
            </TableCell>
          </TableRow>
        )
      }

      const tooltipMessage = networkAlreadyLoaded
        ? 'Network already loaded in the workspace'
        : subnetworkIds.length > 0
          ? 'Collections cannot be imported into Cytoscape Web'
          : 'Network is too large to be loaded into Cytoscape Web.'

      return (
        <Tooltip key={externalId} title={tooltipMessage}>
          <TableRow
            sx={{
              backgroundColor: '#d9d9d9',
              cursor: 'not-allowed',
            }}
            hover={false}
            selected={false}
          >
            <TableCell padding="checkbox">
              <Checkbox disabled />
            </TableCell>
            <TableCell sx={{ maxWidth: 400, ...cellSx }}>
              {name}
            </TableCell>
            <TableCell sx={{ maxWidth: 100, ...cellSx }}>
              {owner ?? ''}
            </TableCell>
            <TableCell sx={{ maxWidth: 50, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                {network.visibility}
              </Typography>
            </TableCell>
            <TableCell sx={{ maxWidth: 10, ...cellSx }}>
              {nodeCount}
            </TableCell>
            <TableCell sx={{ maxWidth: 10, ...cellSx }}>
              {edgeCount ?? 0}
            </TableCell>
            <TableCell sx={{ maxWidth: 10, ...cellSx }}>
              {dateDisplay}
            </TableCell>
          </TableRow>
        </Tooltip>
      )
    })
  }

  const renderContent = (): ReactElement => {
    if (errorMessage) {
      return <Typography color="error">{errorMessage}</Typography>
    }
    if (loading) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 420,
          }}
        >
          <CircularProgress />
        </Box>
      )
    }
    if (displayItems.length === 0) {
      return (
        <Typography sx={{ py: 4, textAlign: 'center' }}>
          {emptyMessage}
        </Typography>
      )
    }

    return (
      <TableContainer sx={{ height: 420 }}>
        <Table size="small" stickyHeader>
          {networks.length > 0 && (
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>
                  <Typography variant="caption" fontWeight="bold">
                    Network
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold">
                    Owner
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold">
                    Visibility
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold">
                    Nodes
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold">
                    Edges
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight="bold">
                    Last modified
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            <FolderSection
              folders={folders}
              onFolderClick={handleFolderClick}
            />
            {networks.length > 0 && folders.length > 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  sx={{ backgroundColor: '#f5f5f5', py: 0.5 }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Networks
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {renderNetworkRows()}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  const tabLabel = (label: string, count: number): ReactElement => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="body2">{label}</Typography>
      {lastSearchQuery !== '' && (
        <Chip label={count} size="small" variant="outlined" />
      )}
    </Box>
  )

  const myNetworksTab = authenticated ? (
    <Tab
      label={tabLabel('My Networks', myNetworksCount)}
      sx={{ textTransform: 'none' }}
    />
  ) : (
    <Tooltip
      arrow
      placement="right"
      title="Login to NDEx to access your networks"
    >
      <Box>
        <Tab
          disabled
          label={tabLabel('My Networks', 0)}
          sx={{ textTransform: 'none' }}
        />
      </Box>
    </Tooltip>
  )

  const privateTab = authenticated ? (
    <Tab
      label={tabLabel('Private & Unlisted', privateCount)}
      sx={{ textTransform: 'none' }}
    />
  ) : (
    <Tooltip
      arrow
      placement="right"
      title="Login to NDEx to access private networks"
    >
      <Box>
        <Tab
          disabled
          label={tabLabel('Private & Unlisted', 0)}
          sx={{ textTransform: 'none' }}
        />
      </Box>
    </Tooltip>
  )

  // Map tab index to SignedInTab
  const tabIndexToKey: SignedInTab[] = [
    'my-networks',
    'public',
    'private',
  ]
  const currentTabIndex = tabIndexToKey.indexOf(activeTab)

  return (
    <Dialog
      data-testid="load-from-ndex-dialog"
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
      fullWidth
      maxWidth="lg"
      open={open}
      onClose={handleClose}
    >
      <DialogTitle>NDEx - Network Browser</DialogTitle>
      <DialogContent>
        {/* Search bar above tabs */}
        <NetworkSearchField
          startSearch={executeSearch}
          handleClose={handleClose}
          searchValue={searchValue}
          onSearchValueChange={setSearchValue}
        />

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            data-testid="load-from-ndex-tabs"
            value={currentTabIndex >= 0 ? currentTabIndex : 0}
            onChange={(_e, val) => {
              setActiveTab(tabIndexToKey[val])
              setCurrentFolderId(null)
              setBreadcrumbPath([
                {
                  name: lastSearchQuery
                    ? `Search: "${lastSearchQuery}"`
                    : tabIndexToKey[val] === 'my-networks'
                    ? 'My Drive'
                    : tabIndexToKey[val] === 'private'
                    ? 'Private Networks'
                    : 'Latest Networks',
                  id: null,
                },
              ])
              setErrorMessage(undefined)
            }}
          >
            {myNetworksTab}
            <Tab
              data-testid="load-from-ndex-public-tab"
              label={tabLabel('Public', publicCount)}
              sx={{ textTransform: 'none' }}
            />
            {privateTab}
          </Tabs>
        </Box>

        {/* Breadcrumbs — always show if we have a path */}
        {breadcrumbPath.length > 0 && (
          <FolderBreadcrumbs
            path={breadcrumbPath}
            onNavigate={handleBreadcrumbNavigate}
            hasError={!!errorMessage}
          />
        )}

        {/* Content */}
        {renderContent()}
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
          <Button
            data-testid="load-from-ndex-cancel-button"
            color="primary"
            onClick={handleClose}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            data-testid="load-from-ndex-open-button"
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
        </Box>
      </DialogActions>
    </Dialog>
  )
}
