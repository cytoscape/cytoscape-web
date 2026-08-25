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
  FormControlLabel,
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
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import { ReactElement, useContext, useEffect, useMemo, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import {
  enrichShortcutsWithTargetSummaries,
  fetchFolderContents,
  fetchFolderInfo,
  fetchNdexSummaries,
  getNetworkIdForFileItem,
  searchNdexFiles,
} from '../../../data/external-api/ndex'
import { NdexFileItem } from '../../../data/external-api/ndex/files'
import { useUrlNavigation } from '../../../data/hooks/navigation/useUrlNavigation'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../../debug'
import { CyDialog } from '@/components/CyDialog'
import { KeycloakContext } from '@/boot/keycloak'
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

// Tabs for the network browser
type BrowseTab = 'public' | 'private'

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
      (item.type === 'SHORTCUT' && item.attributes?.target_type === 'FOLDER')
    ) {
      folders.push(item)
    } else {
      networks.push(item)
    }
  }
  return { folders, networks }
}

// ── Hoisted style objects (stable references for MUI/Emotion) ──────────
const nameCellSx = {
  maxWidth: 400,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const
const ownerCellSx = {
  maxWidth: 100,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const
const visibilityCellSx = {
  maxWidth: 50,
  textAlign: 'center',
  color: 'inherit',
} as const
const visibilityTextSx = {
  color: 'inherit',
  fontWeight: 'bold',
} as const
const countCellSx = {
  maxWidth: 10,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const
const truncationNoticeSx = { textAlign: 'center', py: 2 } as const

export const NetworkSearchField = (props: {
  startSearch: (searchValue: string) => Promise<void>
  handleClose: () => void
}): ReactElement => {
  const [searchValue, setSearchValue] = useState<string>('')

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
        onChange={(e) => setSearchValue(e.target.value)}
        value={searchValue}
        onKeyDown={handleKeyDown}
      />
      <IconButton
        data-testid="load-from-ndex-search-button"
        onClick={() => props.startSearch(searchValue)}
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
          sx={{
            py: 0.5,
            backgroundColor: (theme) => theme.palette.background.default,
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Folders
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
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
          }}
          hover
          onClick={() => onFolderClick(getNetworkIdForFileItem(folder))}
        >
          <TableCell padding="checkbox" />
          <TableCell sx={{ maxWidth: 400, ...cellSx }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderIcon fontSize="small" sx={{ color: 'primary.light' }} />
              {folder.name}
            </Box>
          </TableCell>
          <TableCell sx={{ maxWidth: 100, ...cellSx }}>
            {folder.owner ?? ''}
          </TableCell>
          <TableCell sx={{ maxWidth: 50, textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 'bold' }}
            >
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
  const [activeTab, setActiveTab] = useState<BrowseTab>('public')
  const [onlyMine, setOnlyMine] = useState<boolean>(false)

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

  const rootName =
    activeTab === 'private' ? 'Private Networks' : 'Latest Networks'

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([
    { name: rootName, id: null },
  ])
  const [folderContents, setFolderContents] = useState<NdexFileItem[]>([])

  // Search results state per tab
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
    if (activeTab === 'public') return publicResults
    return privateResults
  }, [
    activeTab,
    folderContents,
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

      // Stamp the origin path so the UI can show where the network was imported from
      const sourcePath = breadcrumbPath.map((b) => b.name).join(' / ')
      summaries.forEach((summary) => {
        summary.sourcePath = sourcePath
      })
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
      const nextCurrentNetworkId: IdType | undefined = summaries[0]?.externalId

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
      setErrorMessage(e instanceof Error ? e.message : String(e))
    }
  }

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
      const enriched = await enrichShortcutsWithTargetSummaries(
        items,
        token,
        ndexBaseUrl,
      )
      setFolderContents(enriched)
      setCurrentFolderId(folderId)

      // Build breadcrumb — add to current path
      setBreadcrumbPath((prev) => [...prev, { name: info.name, id: folderId }])
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
      // Jump back to the cached search results for the current tab.
      return
    }

    setLoading(true)
    setErrorMessage(undefined)
    try {
      const token = await getToken()
      const items = await fetchFolderContents(folderId, token, ndexBaseUrl)
      const enriched = await enrichShortcutsWithTargetSummaries(
        items,
        token,
        ndexBaseUrl,
      )
      setFolderContents(enriched)
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
    setCurrentFolderId(null)

    const tabRootName =
      activeTab === 'private' ? 'Private Networks' : 'Latest Networks'

    setBreadcrumbPath([
      {
        name: trimmedQuery ? `Search: "${trimmedQuery}"` : tabRootName,
        id: null,
      },
    ])

    setLoading(true)
    try {
      const token = authenticated ? await getToken() : undefined
      const userName = client?.tokenParsed?.preferred_username
      const ownerFilter = onlyMine && authenticated ? userName : undefined

      // Fire search requests in parallel
      const promises: Promise<any>[] = []

      // Public tab (always available)
      promises.push(
        searchNdexFiles(
          query,
          'PUBLIC',
          token,
          ownerFilter,
          0,
          500,
          ndexBaseUrl,
        ).then(async (result) => {
          const enriched = await enrichShortcutsWithTargetSummaries(
            result.files,
            token,
            ndexBaseUrl,
          )
          setPublicResults(enriched)
          setPublicCount(result.numFound)
        }),
      )

      // Private tab (authenticated only)
      if (authenticated) {
        promises.push(
          searchNdexFiles(
            query,
            'PRIVATE',
            token,
            ownerFilter,
            0,
            500,
            ndexBaseUrl,
          ).then(async (result) => {
            const enriched = await enrichShortcutsWithTargetSummaries(
              result.files,
              token,
              ndexBaseUrl,
            )
            setPrivateResults(enriched)
            setPrivateCount(result.numFound)
          }),
        )
      }

      const results = await Promise.allSettled(promises)
      const rejected = results.filter(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult[]
      if (rejected.length > 0) {
        setErrorMessage(rejected[0].reason?.message || 'Failed to search NDEx')
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
      void executeSearch('')
    } else {
      setLastSearchQuery('')
      setSelectedNetworks([])
      setErrorMessage(undefined)
      setSuccessMessage(undefined)
      setCurrentFolderId(null)
      setBreadcrumbPath([{ name: 'Latest Networks', id: null }])
      setPublicResults([])
      setPrivateResults([])
      setActiveTab('public')
      setOnlyMine(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only on open/close transitions; executeSearch sets state every call
  }, [open])

  // Re-fetch when "Only mine" filter changes.
  // `open` and `lastSearchQuery` are guards/arguments, not triggers: adding
  // them would double-fetch on dialog open and re-run every user search.
  useEffect(() => {
    if (open) {
      void executeSearch(lastSearchQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onlyMine toggle is the sole trigger
  }, [onlyMine])

  const emptyMessage =
    currentFolderId !== null
      ? 'No items in this folder'
      : isBrowseMode
        ? 'No networks found'
        : 'No search results'

  const MAX_VISIBLE_ROWS = 500

  const renderNetworkRows = (): ReactElement[] => {
    const visibleNetworks = networks.slice(0, MAX_VISIBLE_ROWS)
    const rows = visibleNetworks.map((network) => {
      const {
        uuid: rowKey,
        name,
        owner,
        edges: edgeCount,
        modificationTime,
      } = network

      // Resolved network id — for a SHORTCUT this is its target network, so
      // selection and loading act on the network the shortcut points to. The
      // shortcut's own uuid (rowKey) is kept only for React keys / test ids.
      const externalId = getNetworkIdForFileItem(network)
      const nodeCount =
        network.nodes ??
        network.nodeCount ??
        (network.attributes as any)?.nodeCount ??
        0
      const cx2FileSize =
        network.cx2FileSize ?? (network.attributes as any)?.cx2FileSize ?? 0
      const subnetworkIds =
        network.subnetworkIds ??
        (network.attributes as any)?.subnetworkIds ??
        []

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
            key={rowKey}
            hover
            selected={selected}
            onClick={() => toggleSelectedNetwork(externalId)}
            sx={{
              cursor: 'pointer',
            }}
          >
            <TableCell padding="checkbox">
              <Checkbox
                data-testid={`load-from-ndex-network-checkbox-${rowKey}`}
                onClick={() => toggleSelectedNetwork(externalId)}
                checked={selected}
              />
            </TableCell>
            <TableCell sx={nameCellSx}>{name}</TableCell>
            <TableCell sx={ownerCellSx}>{owner ?? ''}</TableCell>
            <TableCell sx={visibilityCellSx}>
              <Typography variant="caption" sx={visibilityTextSx}>
                {network.visibility}
              </Typography>
            </TableCell>
            <TableCell sx={countCellSx}>{nodeCount}</TableCell>
            <TableCell sx={countCellSx}>{edgeCount ?? 0}</TableCell>
            <TableCell sx={countCellSx}>{dateDisplay}</TableCell>
          </TableRow>
        )
      }

      const tooltipMessage = networkAlreadyLoaded
        ? 'Network already loaded in the workspace'
        : subnetworkIds.length > 0
          ? 'Collections cannot be imported into Cytoscape Web'
          : 'Network is too large to be loaded into Cytoscape Web.'

      return (
        <Tooltip key={rowKey} title={tooltipMessage}>
          <TableRow
            hover={false}
            selected={false}
            sx={{
              color: (theme) => theme.palette.text.disabled,
              cursor: 'not-allowed',
            }}
          >
            <TableCell padding="checkbox">
              <Checkbox disabled />
            </TableCell>
            <TableCell sx={{ color: 'inherit', ...nameCellSx }}>
              {name}
            </TableCell>
            <TableCell sx={{ color: 'inherit', ...ownerCellSx }}>
              {owner ?? ''}
            </TableCell>
            <TableCell sx={visibilityCellSx}>
              <Typography variant="caption" sx={visibilityTextSx}>
                {network.visibility}
              </Typography>
            </TableCell>
            <TableCell sx={{ color: 'inherit', ...countCellSx }}>
              {nodeCount}
            </TableCell>
            <TableCell sx={{ color: 'inherit', ...countCellSx }}>
              {edgeCount ?? 0}
            </TableCell>
            <TableCell sx={{ color: 'inherit', ...countCellSx }}>
              {dateDisplay}
            </TableCell>
          </TableRow>
        </Tooltip>
      )
    })

    if (networks.length > MAX_VISIBLE_ROWS) {
      rows.push(
        <TableRow key="__truncation_notice__">
          <TableCell colSpan={7} sx={truncationNoticeSx}>
            <Typography variant="body2" color="text.secondary">
              Showing {MAX_VISIBLE_ROWS} of {networks.length} networks. Use
              search to narrow results.
            </Typography>
          </TableCell>
        </TableRow>,
      )
    }

    return rows
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
      <TableContainer
        sx={{
          height: 420,
          borderRadius: 1,
        }}
      >
        <Table size="small" stickyHeader>
          {networks.length > 0 && (
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: (theme) => theme.palette.background.subtle,
                }}
              >
                <TableCell
                  padding="checkbox"
                  sx={{ backgroundColor: 'inherit' }}
                />
                <TableCell sx={{ backgroundColor: 'inherit' }}>
                  <Typography variant="caption" fontWeight="bold">
                    Network
                  </Typography>
                </TableCell>
                <TableCell sx={{ backgroundColor: 'inherit' }}>
                  <Typography variant="caption" fontWeight="bold">
                    Owner
                  </Typography>
                </TableCell>
                <TableCell sx={{ backgroundColor: 'inherit' }}>
                  <Typography variant="caption" fontWeight="bold">
                    Visibility
                  </Typography>
                </TableCell>
                <TableCell sx={{ backgroundColor: 'inherit' }}>
                  <Typography variant="caption" fontWeight="bold">
                    Nodes
                  </Typography>
                </TableCell>
                <TableCell sx={{ backgroundColor: 'inherit' }}>
                  <Typography variant="caption" fontWeight="bold">
                    Edges
                  </Typography>
                </TableCell>
                <TableCell sx={{ backgroundColor: 'inherit' }}>
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
                  sx={{
                    py: 0.5,
                    backgroundColor: (theme) =>
                      theme.palette.background.default,
                  }}
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

  const privateTab = authenticated ? (
    <Tooltip
      arrow
      placement="bottom"
      title="Search for private or unlisted networks shared with you"
    >
      <Tab
        label={tabLabel('Private & Unlisted', privateCount)}
        sx={{ textTransform: 'none' }}
      />
    </Tooltip>
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

  // Map tab index to BrowseTab
  const availableTabs: BrowseTab[] = authenticated
    ? ['public', 'private']
    : ['public']
  const currentTabIndex = availableTabs.indexOf(activeTab)

  return (
    <CyDialog
      dismiss="form"
      data-testid="load-from-ndex-dialog"
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
        />

        {/* Only mine checkbox + Tabs */}
        {authenticated && (
          <Tooltip
            arrow
            placement="bottom"
            title="When checked, only show networks you own. When unchecked, show all networks."
          >
            <FormControlLabel
              control={
                <Checkbox
                  data-testid="load-from-ndex-only-mine-checkbox"
                  checked={onlyMine}
                  size="small"
                />
              }
              label="Only mine"
              onClick={(e) => {
                e.stopPropagation()
                setOnlyMine(!onlyMine)
              }}
              sx={{ my: 1 }}
            />
          </Tooltip>
        )}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tabs
            data-testid="load-from-ndex-tabs"
            value={currentTabIndex >= 0 ? currentTabIndex : 0}
            onChange={(_e, val) => {
              const newTab = availableTabs[val]
              setActiveTab(newTab)
              setCurrentFolderId(null)
              const tabRootName =
                newTab === 'private' ? 'Private Networks' : 'Latest Networks'
              setBreadcrumbPath([
                {
                  name: lastSearchQuery
                    ? `Search: "${lastSearchQuery}"`
                    : tabRootName,
                  id: null,
                },
              ])
              setErrorMessage(undefined)
            }}
          >
            <Tooltip
              arrow
              placement="bottom"
              title="Query public networks in NDEx"
            >
              <Tab
                data-testid="load-from-ndex-public-tab"
                label={tabLabel('Public', publicCount)}
                sx={{ textTransform: 'none' }}
              />
            </Tooltip>
            {authenticated && privateTab}
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
            variant="outlined"
            color="primary"
            onClick={handleClose}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            data-testid="load-from-ndex-open-button"
            variant="contained"
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
            {`Open ${selectedNetworks.length > 0 ? selectedNetworks.length : ''} Network${selectedNetworks.length !== 1 ? 's' : ''}`}
          </Button>
        </Box>
      </DialogActions>
    </CyDialog>
  )
}
