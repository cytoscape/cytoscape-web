import { styled } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import HelpIcon from '@mui/icons-material/Help'
import StarIcon from '@mui/icons-material/Star'
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { putNetworkSummaryToDb } from '../../../data/db'
import { useUrlNavigation } from '../../../data/hooks/navigation/useUrlNavigation'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useLoadCyNetwork } from '../../../data/hooks/useLoadCyNetwork'
import { logUi } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { createNetworkSummary } from '../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { Column } from '../../../models/TableModel'
import { ConfirmationDialog } from '../../ConfirmationDialog'
import {
  MergeType,
  NetworkRecord,
  Pair,
  TableView,
} from '../models/DataInterfaceForMerge'
import { createMergedNetwork } from '../models/Impl/CreateMergedNetwork'
import { createMatchingTable } from '../models/Impl/MatchingTableImpl'
import {
  mergeOpaqueAspects,
  toOpaqueAspectsArray,
} from '../utils/mergeOpaqueAspects'
import useEdgeMatchingTableStore from '../store/edgeMatchingTableStore'
import useMatchingColumnsStore from '../store/matchingColumnStore'
import useMergeToolTipStore from '../store/mergeToolTip'
import useNetMatchingTableStore from '../store/netMatchingTableStore'
import useNodeMatchingTableStore from '../store/nodeMatchingTableStore'
import useNodesDuplicationStore from '../store/nodesDuplicationStore'
import {
  checkDuplication,
  findPairIndex,
  getNetTableFromSummary,
  sortListAlphabetically,
} from '../utils/mergeNetworkUtil'
import { DifferenceIcon, IntersectionIcon, UnionIcon } from './Icon'
import { MatchingColumnTable } from './MatchingColumnTable'
import { MatchingTableComp } from './MatchingTableComp'

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  border: `1px solid ${theme.palette.text.secondary} !important`,
  '&:first-of-type': {
    borderRight: 'none',
  },
  '&:last-of-type': {
    borderLeft: 'none',
  },
  '&.Mui-selected': {
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
  },
  '&.Mui-selected:hover': {
    backgroundColor: theme.palette.primary.main,
  },
  '& .MuiSvgIcon-root': {
    color: theme.palette.text.primary,
  },
  '&.Mui-selected .MuiSvgIcon-root': {
    color: theme.palette.primary.contrastText,
  },
}))

const StyledListSubheader = styled(ListSubheader)(({ theme }) => ({
  backgroundColor: theme.palette.background.subtle,
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRadius: '4px 4px 0 0',
}))

const ArrowButton = ({
  disabled,
  children,
  onClick,
}: {
  disabled: boolean
  children: React.ReactNode
  onClick: () => void
}) => (
  <Button
    variant="contained"
    onClick={onClick}
    disabled={disabled}
    size="small"
    sx={{
      mt: 1,
      p: 0.5,
      minWidth: 36,
    }}
  >
    {children}
  </Button>
)

interface MergeDialogProps {
  open: boolean
  handleClose: () => void
  uniqueName: string
  workSpaceNetworks: Pair<string, IdType>[]
  networksLoaded: Record<IdType, NetworkRecord>
}

const MergeDialog: React.FC<MergeDialogProps> = ({
  open,
  handleClose,
  uniqueName,
  workSpaceNetworks,
  networksLoaded,
}): React.ReactElement => {
  const [tableView, setTableView] = useState(TableView.node) // Current table view
  const [errorMessage, setErrorMessage] = useState('') // Error message to display
  const [showError, setShowError] = useState(false) // Flag to show the error message panel
  const [mergeOpType, setMergeOpType] = useState(MergeType.union) // Type of merge operation
  const [mergeWithinNetwork, setMergeWithinNetwork] = useState(true) // Flag to indicate whether to merge within the same network
  const [mergeOnlyNodes, setMergeOnlyNodes] = useState(false) // Flag to indicate whether to ignore type conflicts
  const [mergedNetworkName, setMergedNetworkName] = useState(uniqueName) // Name of the merged network
  const [fullScreen, setFullScreen] = useState(false) // Full screen mode for the dialog
  const [tooltipOpen, setTooltipOpen] = useState(false) // Flag to indicate whether the tooltip is open
  const [strictRemoveMode, setStrictRemoveMode] = useState(false) // Flag to indicate the rules of difference merge
  const [isNameDuplicate, setIsNameDuplicate] = useState(false) // Flag to indicate whether the network name is a duplicate
  const existingNetNames = new Set(workSpaceNetworks.map((pair) => pair[0])) // Set of existing network names
  const nodesDuplication = useNodesDuplicationStore(
    (state) => state.nodesDuplication,
  )
  const setNodesDuplication = useNodesDuplicationStore(
    (state) => state.setNodesDuplication,
  )
  const removeNetInNodesDuplication = useNodesDuplicationStore(
    (state) => state.removeNetworks,
  )
  const resetNodesDuplication = useNodesDuplicationStore(
    (state) => state.resetStore,
  )
  const mergeTooltipIsOpen = useMergeToolTipStore((state) => state.isOpen)
  const mergeTooltipText = useMergeToolTipStore((state) => state.text)
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)
  // confirmation window
  const [openConfirmation, setOpenConfirmation] = useState(false)
  const [confirmationTitle, setConfirmationTitle] = useState('')
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [onConfirmation, setOnConfirmation] = useState<() => void>(() => {})
  // Record the information of the networks to be merged
  const [networkRecords, setNetworkRecords] = useState<
    Record<IdType, NetworkRecord>
  >({})
  // Record the matching columns for each network
  const matchingCols = useMatchingColumnsStore((state) => state.matchingCols)
  const setMatchingCols = useMatchingColumnsStore(
    (state) => state.setMatchingCols,
  )
  const resetMatchingCols = useMatchingColumnsStore((state) => state.resetStore)
  // // Record the state of the matching table
  const nodeMatchingTable = useNodeMatchingTableStore((state) => state.rows)
  const addNetsToNodeTable = useNodeMatchingTableStore(
    (state) => state.addNetworksToTable,
  )
  const removeNetsFromNodeTable = useNodeMatchingTableStore(
    (state) => state.removeNetworksFromTable,
  )
  const resetNodeMatchingTable = useNodeMatchingTableStore(
    (state) => state.resetStore,
  )
  const edgeMatchingTable = useEdgeMatchingTableStore((state) => state.rows)
  const addNetsToEdgeTable = useEdgeMatchingTableStore(
    (state) => state.addNetworksToTable,
  )
  const removeNetsFromEdgeTable = useEdgeMatchingTableStore(
    (state) => state.removeNetworksFromTable,
  )
  const resetEdgeMatchingTable = useEdgeMatchingTableStore(
    (state) => state.resetStore,
  )
  const netMatchingTable = useNetMatchingTableStore((state) => state.rows)
  const addNetsToNetTable = useNetMatchingTableStore(
    (state) => state.addNetworksToTable,
  )
  const removeNetsFromNetTable = useNetMatchingTableStore(
    (state) => state.removeNetworksFromTable,
  )
  const resetNetMatchingTable = useNetMatchingTableStore(
    (state) => state.resetStore,
  )
  // Record the status of the available and selected networks lists
  const [availableNetworksList, setAvailableNetworksList] = useState<
    Pair<string, IdType>[]
  >(sortListAlphabetically(workSpaceNetworks))
  const [toMergeNetworksList, setToMergeNetworksList] = useState<
    Pair<string, IdType>[]
  >([])
  const [selectedAvailable, setSelectedAvailable] = useState<
    Pair<string, IdType>[]
  >([])
  const [selectedToMerge, setSelectedToMerge] = useState<
    Pair<string, IdType>[]
  >([])
  // Initialize the matching tables
  const nodeMatchingTableObj = createMatchingTable(nodeMatchingTable)
  const edgeMatchingTableObj = createMatchingTable(edgeMatchingTable)
  const netMatchingTableObj = createMatchingTable(netMatchingTable)
  // Functions relying on store hooks
  const addSummaries = useNetworkSummaryStore((state) => state.addAll)
  const netSummaries = useNetworkSummaryStore((state) => state.summaries)
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )
  const addNewNetwork = useNetworkStore((state) => state.add)
  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const setViewModel = useViewModelStore((state) => state.add)
  const setTables = useTableStore((state) => state.add)
  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  // Functions to select networks to merge or undo the selection
  const handleSelectAvailable = (uuid: string) => {
    const currentIndex = findPairIndex(selectedAvailable, uuid)
    const newSelectedAvailable = [...selectedAvailable]

    if (currentIndex === -1) {
      // Find the full pair in the available networks list and add it
      const pairToAdd = availableNetworksList.find((pair) => pair[1] === uuid)
      if (pairToAdd) newSelectedAvailable.push(pairToAdd)
    } else {
      newSelectedAvailable.splice(currentIndex, 1)
    }

    setSelectedAvailable(newSelectedAvailable)
  }

  const handleSelectToMerge = (uuid: string) => {
    const currentIndex = findPairIndex(selectedToMerge, uuid)
    const newSelectedToMerge = [...selectedToMerge]

    if (currentIndex === -1) {
      // Find the full pair in the selected networks list and add it
      const pairToAdd = toMergeNetworksList.find((pair) => pair[1] === uuid)
      if (pairToAdd) newSelectedToMerge.push(pairToAdd)
    } else {
      newSelectedToMerge.splice(currentIndex, 1)
    }

    setSelectedToMerge(newSelectedToMerge)
  }
  // Function to add selected networks to the 'Networks to Merge' list
  const handleAddNetwork = async () => {
    if (
      mergeOpType === MergeType.difference &&
      toMergeNetworksList.length + selectedAvailable.length > 2
    ) {
      setConfirmationTitle('Warning!')
      setConfirmationMessage(
        'Difference operation only supports two networks.\
                                     If you want to replace the selected network, remove\
                                     it first and select a new one.',
      )
      setOnConfirmation(() => () => {
        setSelectedAvailable([])
        setOpenConfirmation(false)
      })
      setOpenConfirmation(true)
      return
    }
    const newMatchingCols: Record<string, Column> = {}
    const newNetworkRecords: Record<IdType, NetworkRecord> = {}
    const newNodesDuplication: Record<string, boolean> = {}
    for (const net of selectedAvailable) {
      // Load the network data
      let netData = networkRecords[net[1]] // Attempt to use cached data
      if (!netData) {
        netData = await loadNetworkById(net[1]) // Fetch and use fresh data if not available
      }
      newNetworkRecords[net[1]] = netData
      // Set the default matching column for the network
      let hasName = false
      const nodeTable = netData.nodeTable
      for (const col of nodeTable.columns ?? []) {
        if (col.name === 'name' && col.type === 'string') {
          newMatchingCols[net[1]] = { name: 'name', type: 'string' } as Column
          hasName = true
          break
        }
      }
      if (!hasName) {
        newMatchingCols[net[1]] =
          nodeTable.columns.length > 0
            ? nodeTable.columns[0]
            : ({ name: 'none', type: 'string' } as Column)
      }
      if (nodeTable.columns.length > 0) {
        const matchingColName = newMatchingCols[net[1]].name
        newNodesDuplication[net[1]] = checkDuplication(
          nodeTable,
          matchingColName,
        )
      }
    }
    setNodesDuplication(newNodesDuplication)
    // Add the networks to the matching tables
    addNetsToNodeTable(
      selectedAvailable.map((pair) => pair[1]),
      newNetworkRecords,
      newMatchingCols,
    )
    addNetsToEdgeTable(
      selectedAvailable.map((pair) => pair[1]),
      newNetworkRecords,
      newMatchingCols,
    )
    addNetsToNetTable(
      selectedAvailable.map((pair) => pair[1]),
      newNetworkRecords,
      newMatchingCols,
    )
    // Update the state stores
    setNetworkRecords({ ...networkRecords, ...newNetworkRecords })
    setToMergeNetworksList([...toMergeNetworksList, ...selectedAvailable])
    setAvailableNetworksList(
      availableNetworksList.filter((net) => !selectedAvailable.includes(net)),
    )
    setMatchingCols({ ...matchingCols, ...newMatchingCols })
    setSelectedAvailable([])
  }
  // Function to remove selected networks from the 'Networks to Merge' list
  const handleRemoveNetwork = () => {
    setAvailableNetworksList(
      sortListAlphabetically([...availableNetworksList, ...selectedToMerge]),
    )
    setToMergeNetworksList(
      toMergeNetworksList.filter((net) => !selectedToMerge.includes(net)),
    )
    //Todo: whether to delete all these information or not
    const newNetworkRecords = { ...networkRecords }
    const newMatchingCols = { ...matchingCols }
    selectedToMerge.forEach((net) => {
      delete newNetworkRecords[net[1]]
      delete newMatchingCols[net[1]]
    })
    // Remove the networks from the matching tables
    removeNetsFromNodeTable(selectedToMerge.map((pair) => pair[1]))
    removeNetsFromEdgeTable(selectedToMerge.map((pair) => pair[1]))
    removeNetsFromNetTable(selectedToMerge.map((pair) => pair[1]))
    // Update the state stores
    removeNetInNodesDuplication(selectedToMerge.map((pair) => pair[1]))
    setNetworkRecords(newNetworkRecords)
    setMatchingCols(newMatchingCols)
    setSelectedToMerge([])
  }

  // Function to move selected networks up
  const handleMoveUp = () => {
    const newToMergeNetworksList = [...toMergeNetworksList]
    // Retrieve the current indices of the selected networks and sort them in ascending order for moving up
    const sortedSelected = selectedToMerge
      .map((selected) =>
        newToMergeNetworksList.findIndex(
          (network) => network[1] === selected[1],
        ),
      )
      .sort((a, b) => a - b)

    sortedSelected.forEach((currentIndex) => {
      if (
        currentIndex > 0 &&
        !selectedToMerge.some(
          (net) => net[1] === newToMergeNetworksList[currentIndex - 1][1],
        )
      ) {
        const temp = newToMergeNetworksList[currentIndex - 1]
        newToMergeNetworksList[currentIndex - 1] =
          newToMergeNetworksList[currentIndex]
        newToMergeNetworksList[currentIndex] = temp
      }
    })

    setToMergeNetworksList(newToMergeNetworksList)
  }
  // Function to move selected networks down
  const handleMoveDown = () => {
    const newToMergeNetworksList = [...toMergeNetworksList]
    // Retrieve the current indices of the selected networks and sort them in descending order for moving down
    const sortedSelected = selectedToMerge
      .map((selected) =>
        newToMergeNetworksList.findIndex(
          (network) => network[1] === selected[1],
        ),
      )
      .sort((a, b) => b - a)

    sortedSelected.forEach((currentIndex) => {
      if (
        currentIndex < newToMergeNetworksList.length - 1 &&
        !selectedToMerge.some(
          (net) => net[1] === newToMergeNetworksList[currentIndex + 1][1],
        )
      ) {
        const temp = newToMergeNetworksList[currentIndex + 1]
        newToMergeNetworksList[currentIndex + 1] =
          newToMergeNetworksList[currentIndex]
        newToMergeNetworksList[currentIndex] = temp
      }
    })

    setToMergeNetworksList(newToMergeNetworksList)
  }
  // Function to handle changes in the merged network name
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value
    setMergedNetworkName(newName)
    setIsNameDuplicate(existingNetNames.has(newName?.trim()))
  }
  // Function to handle switch in the matching table view
  const handleTableViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newTableView: TableView,
  ) => {
    if (newTableView !== null) {
      setTableView(newTableView)
    }
  }
  const handleFullScreenToggle = () => {
    setFullScreen(!fullScreen)
    setTooltipOpen(false) // Close tooltip on toggle
  }

  // Set the initial state of the networkRecords
  // Mount-only snapshot by design: `networksLoaded` is a fresh object literal
  // from the parent on every render, so adding it would re-fire the cleanup
  // (wiping the user's in-progress matching config) and resurrect networks
  // the user removed from the merge list.
  useEffect(() => {
    setNetworkRecords(networksLoaded)
    return () => {
      resetNodeMatchingTable()
      resetEdgeMatchingTable()
      resetNetMatchingTable()
      resetMatchingCols()
      resetNodesDuplication()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only snapshot; deps would reset stores mid-session
  }, [])
  // set merge type
  const handleMergeTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    opType: string,
  ) => {
    if (opType !== null) {
      if (opType === MergeType.difference && toMergeNetworksList.length > 2) {
        setConfirmationTitle('Warning: Only two networks will be kept!')
        setConfirmationMessage(
          'Only the first two networks in the selected network\
                                        list will be merged for the difference operation.\
                                        All the other selected networks will be removed.Are you sure ? ',
        )
        setOnConfirmation(() => () => {
          //only keep the first two networks in the networksToMerge List
          const networksToRemove = toMergeNetworksList.slice(2)
          const newNetworkRecords = { ...networkRecords }
          const newMatchingCols = { ...matchingCols }
          networksToRemove.forEach((net) => {
            delete newNetworkRecords[net[1]]
            delete newMatchingCols[net[1]]
          })
          removeNetsFromNodeTable(networksToRemove.map((pair) => pair[1]))
          removeNetsFromEdgeTable(networksToRemove.map((pair) => pair[1]))
          removeNetsFromNetTable(networksToRemove.map((pair) => pair[1]))
          setNetworkRecords(newNetworkRecords)
          setMatchingCols(newMatchingCols)
          setSelectedToMerge([])
          setToMergeNetworksList(toMergeNetworksList.slice(0, 2))
          setAvailableNetworksList([
            ...availableNetworksList,
            ...networksToRemove,
          ])
          setMergeOpType(MergeType.difference)
          setOpenConfirmation(false)
        })
        setOpenConfirmation(true)
      } else {
        setMergeOpType(opType as MergeType)
      }
    }
  }

  //utility function to get token
  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )
  const loadCyNetwork = useLoadCyNetwork()
  //utility function to load network by id
  const loadNetworkById = async (networkId: IdType) => {
    const currentToken = await getToken()
    const res = await loadCyNetwork(networkId, currentToken)
    const { network, nodeTable, edgeTable, visualStyle } = res
    const summary = netSummaries[networkId]
    const netTable = getNetTableFromSummary(summary)
    return { network, nodeTable, edgeTable, netTable, visualStyle }
  }
  const handleStrictRemoveModeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setStrictRemoveMode(event.target.value === 'true')
  }

  // Handler for the 'Merge' button
  const handleMerge = async (): Promise<void> => {
    try {
      const newNetworkId = uuidv4()
      const summaryRecord: Record<IdType, NetworkSummary> = Object.fromEntries(
        Object.entries(netSummaries).filter(([id]) =>
          toMergeNetworksList.some((pair) => pair[1] === id),
        ),
      )

      // Merge opaque (non-core) aspects from the source networks (CW-522):
      // concatenate + dedupe per aspect key.
      const sourceNetworkIds = toMergeNetworksList.map((i) => i[1])
      const allOpaqueAspects = useOpaqueAspectStore.getState().opaqueAspects
      const mergedOpaqueAspects = mergeOpaqueAspects(
        sourceNetworkIds.map((id) => allOpaqueAspects[id]),
      )
      const mergedOpaqueAspectsArray = toOpaqueAspectsArray(mergedOpaqueAspects)

      const [newCyNetwork, networkSummary] = await createMergedNetwork(
        sourceNetworkIds,
        newNetworkId,
        mergedNetworkName,
        networkRecords,
        nodeMatchingTableObj,
        edgeMatchingTableObj,
        netMatchingTableObj,
        matchingCols,
        summaryRecord,
        mergeOpType,
        mergeWithinNetwork,
        mergeOnlyNodes,
        strictRemoveMode,
        mergedOpaqueAspectsArray,
      )

      const newSummary = createNetworkSummary({
        ...networkSummary,
        networkId: newNetworkId,
        hasLayout: false, // Merged networks don't have layout initially
        nodeCount: newCyNetwork.network.nodes.length,
        edgeCount: newCyNetwork.network.edges.length,
      })
      // Update state stores with the new network and its components
      setVisualStyleOptions(newNetworkId, newCyNetwork.visualStyleOptions)
      addNetworkToWorkspace(newNetworkId)
      addNewNetwork(newCyNetwork.network)
      setVisualStyle(newNetworkId, newCyNetwork.visualStyle)
      setTables(newNetworkId, newCyNetwork.nodeTable, newCyNetwork.edgeTable)
      setViewModel(newNetworkId, newCyNetwork.networkViews[0])
      // Persist merged opaque aspects so they survive and are re-exported to CX2
      // (CW-522).
      if (mergedOpaqueAspectsArray.length > 0) {
        addAllOpaqueAspects(newNetworkId, mergedOpaqueAspectsArray)
      }
      await putNetworkSummaryToDb(newSummary)
      addSummaries({ [newNetworkId]: newSummary })
      // Apply layout to the network
      setCurrentNetworkId(newNetworkId)
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: newNetworkId,
        searchParams: new URLSearchParams(location.search),
        replace: true,
      })
      handleClose()
    } catch (e) {
      logUi.error(`[${handleMerge.name}]: Error merging networks:`, e)
      setErrorMessage(
        `An error occurred: ${e instanceof Error ? e.message : String(e)}`,
      ) // Set the error message
      setShowError(true) // Show the error message panel
    }
  }

  return (
    <Dialog
      data-testid="merge-dialog"
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth={true}
      open={open}
      onClose={handleClose}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        paddingRight={1}
        paddingLeft={1}
      >
        <DialogTitle>Advanced Network Merge</DialogTitle>
        <Tooltip
          title={fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
          placement={fullScreen ? 'bottom' : 'top'}
          open={tooltipOpen}
          onClose={() => setTooltipOpen(false)}
        >
          <IconButton
            data-testid="merge-dialog-fullscreen-button"
            onClick={handleFullScreenToggle}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
            color="inherit"
          >
            {fullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <DialogContent sx={{ paddingTop: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <ToggleButtonGroup
            data-testid="merge-dialog-operation-type"
            value={mergeOpType}
            exclusive
            onChange={handleMergeTypeChange}
            aria-label="text alignment"
          >
            <StyledToggleButton
              data-testid="merge-dialog-union-button"
              value={MergeType.union}
              aria-label="left aligned"
            >
              <UnionIcon /> Union
            </StyledToggleButton>
            <StyledToggleButton
              data-testid="merge-dialog-intersection-button"
              value={MergeType.intersection}
              aria-label="centered"
            >
              <IntersectionIcon /> Intersection
            </StyledToggleButton>
            <StyledToggleButton
              data-testid="merge-dialog-difference-button"
              value={MergeType.difference}
              aria-label="right aligned"
            >
              <DifferenceIcon /> Difference
            </StyledToggleButton>
          </ToggleButtonGroup>
          <Tooltip
            title={
              <Box sx={{ maxWidth: '220px' }}>
                <p>
                  <strong>UNION:</strong> Adds the subsequent network(s) to the
                  base network, merging any common nodes and edges.
                </p>
                <p>
                  <strong>INTERSECTION:</strong> Creates a network containing
                  only the nodes and edges that are common across all selected
                  networks.
                </p>
                <p>
                  <strong>DIFFERENCE:</strong> Subtracts the base network from
                  the second network according to the specified node removal
                  rule.
                </p>
              </Box>
            }
            placement="right"
          >
            <Box>
              <HelpIcon
                sx={{ color: (theme) => theme.palette.text.secondary }}
              />
            </Box>
          </Tooltip>
        </Box>

        {mergeOpType === MergeType.difference && (
          <FormControl
            component="fieldset"
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              mb: 4,
              width: '100%',
            }}
          >
            <FormLabel component="legend" sx={{ mx: 1.5, px: 0.5 }}>
              Node Removal Rule
            </FormLabel>
            <RadioGroup
              aria-label="node removal policy"
              value={strictRemoveMode.toString()}
              onChange={handleStrictRemoveModeChange}
              name="node-removal-options"
              sx={{ ml: 2, pb: 1 }}
            >
              <FormControlLabel
                value="false" // String value for false
                control={<Radio />}
                label="Only remove nodes if all their edges are being subtracted, too"
              />
              <FormControlLabel
                value="true" // String value for true
                control={<Radio />}
                label="Remove all nodes that are in the second network"
              />
            </RadioGroup>
          </FormControl>
        )}

        <FormControl sx={{ width: '100%' }}>
          <FormLabel
            htmlFor="merged-network-name"
            sx={{
              mb: 0.5,
              fontWeight: 'bold',
              color: (theme) => theme.palette.text.primary,
            }}
          >
            Merged Network Name:
          </FormLabel>
          <TextField
            id="merged-network-name"
            placeholder="Enter merged network name"
            value={mergedNetworkName}
            onChange={handleNameChange}
            fullWidth
            size="small"
            InputProps={{
              sx: {
                color: (theme) =>
                  isNameDuplicate ? theme.palette.warning.main : 'inherit',
              },
            }}
          />
          <Typography
            component="caption"
            sx={{
              color: (theme) => theme.palette.warning.main,
              textAlign: 'left',
              fontSize: '0.875rem',
              ml: 0.5,
            }}
          >
            {isNameDuplicate
              ? 'Warning: A network with this name already exists in your workspace.'
              : '\u00A0'}
          </Typography>
        </FormControl>

        <Typography
          sx={{
            mt: 1,
            mb: 0.5,
            fontWeight: 'bold',
            color: (theme) => theme.palette.text.primary,
          }}
        >
          Select Networks to Merge:
        </Typography>
        <Box display="flex" justifyContent="space-between">
          <Paper variant="outlined" sx={{ width: '42.5%' }}>
            <StyledListSubheader>Available Networks</StyledListSubheader>
            <List dense sx={{ overflow: 'auto', maxHeight: 250 }}>
              {availableNetworksList.map((network, index) => (
                <ListItem
                  key={index}
                  button
                  selected={selectedAvailable.includes(network)}
                  onClick={() => handleSelectAvailable(network[1])}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: (theme) => theme.palette.action.selected,
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: (theme) => theme.palette.action.selected,
                    },
                  }}
                >
                  <ListItemText
                    primary={network[0]}
                    sx={{ color: (theme) => theme.palette.text.secondary }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            m={1}
          >
            <ArrowButton
              disabled={selectedAvailable.length === 0}
              onClick={handleAddNetwork}
            >
              <ArrowForwardIcon fontSize="small" />
            </ArrowButton>
            <ArrowButton
              disabled={selectedToMerge.length === 0}
              onClick={handleRemoveNetwork}
            >
              <ArrowBackIcon fontSize="small" />
            </ArrowButton>
          </Box>

          <Paper variant="outlined" sx={{ width: '42.5%' }}>
            <StyledListSubheader>Networks to Merge</StyledListSubheader>
            <List dense sx={{ overflow: 'auto', maxHeight: 250 }}>
              {toMergeNetworksList.map((network, index) => (
                <ListItem
                  button
                  selected={selectedToMerge.includes(network)}
                  onClick={() => handleSelectToMerge(network[1])}
                  key={index}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: (theme) => theme.palette.action.selected,
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: (theme) => theme.palette.action.selected,
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box>{network[0]}</Box>
                        {index === 0 && (
                          <Tooltip
                            title="This is the base network"
                            placement="top"
                            arrow
                          >
                            <StarIcon
                              viewBox="0 1 24 24"
                              sx={{
                                color: (theme) => theme.palette.secondary.light,
                              }}
                            />
                          </Tooltip>
                        )}
                        {nodesDuplication[network[1]] && (
                          <Tooltip
                            title={`The node values under the chosen matching column '${matchingCols[network[1]].name}' are not all unique`}
                            placement="top"
                            arrow
                          >
                            <ReportGmailerrorredIcon
                              viewBox="0 0.5 24 24"
                              sx={{
                                color: (theme) => theme.palette.warning.main,
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    }
                    sx={{ color: (theme) => theme.palette.text.secondary }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            m={1}
          >
            <ArrowButton
              disabled={selectedToMerge.length === 0}
              onClick={handleMoveUp}
            >
              <ArrowUpwardIcon fontSize="small" />
            </ArrowButton>
            <ArrowButton
              disabled={selectedToMerge.length === 0}
              onClick={handleMoveDown}
            >
              <ArrowDownwardIcon fontSize="small" />
            </ArrowButton>
          </Box>
        </Box>

        {Object.values(nodesDuplication).some((v) => v === true) && (
          <Box
            display="flex"
            alignItems="flex-start"
            gap={1}
            sx={{ ml: 1, mr: 1 }}
          >
            <ReportGmailerrorredIcon
              viewBox="0 0 24 24"
              sx={{ color: (theme) => theme.palette.warning.main }}
            />
            <Typography
              component="caption"
              sx={{
                color: (theme) => theme.palette.warning.main,
                textAlign: 'left',
                fontSize: '0.875rem',
                ml: 0.5,
              }}
            >
              Some nodes have duplicate values under the &apos;Matching
              Column&apos;. Hover over the warning icon or check &apos;Advanced
              Options&apos; for details. Enabling &apos;Merge nodes/edges in the
              same network&apos; might also be an option.
            </Typography>
          </Box>
        )}

        <Box display="flex" flexDirection="column" justifyContent="left" my={4}>
          <FormControlLabel
            control={
              <Checkbox
                checked={mergeWithinNetwork}
                onChange={(e) => setMergeWithinNetwork(e.target.checked)}
                name="mergeWithinNetwork"
                color="primary"
              />
            }
            label="Enable merging nodes/edges in the same network"
          />
          <Tooltip
            placement="top-start"
            title={`Cannot ignore edges when operating '${mergeOpType} Merge'`}
            disableHoverListener={MergeType.intersection === mergeOpType} // Tooltip is only active when the checkbox is disabled
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={mergeOnlyNodes}
                  onChange={(e) => setMergeOnlyNodes(e.target.checked)}
                  name="mergeOnlyNodes"
                  color="primary"
                  disabled={MergeType.intersection !== mergeOpType}
                />
              }
              label="Merge only nodes and ignore edges"
            />
          </Tooltip>
        </Box>

        <Accordion
          sx={{
            position: 'unset',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            boxShadow: 'none',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Advanced Options</Typography>
          </AccordionSummary>

          <AccordionDetails>
            <Typography
              sx={{
                mt: 1,
                mb: 0.5,
                fontWeight: 'bold',
                color: (theme) => theme.palette.text.primary,
              }}
            >
              Matching Columns:
            </Typography>
            <MatchingColumnTable
              networkRecords={networkRecords}
              toMergeNetworksList={toMergeNetworksList}
              matchingCols={matchingCols}
            />

            <Typography
              sx={{
                mt: 2,
                mb: 0.5,
                fontWeight: 'bold',
                color: (theme) => theme.palette.text.primary,
              }}
            >
              How to merge columns:
            </Typography>
            {tableView !== null && (
              <MatchingTableComp
                networkRecords={networkRecords}
                netLst={toMergeNetworksList}
                tableView={tableView}
                mergeOpType={mergeOpType}
                mergeWithinNetwork={mergeWithinNetwork}
              />
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <ToggleButtonGroup
                  value={tableView}
                  exclusive
                  onChange={handleTableViewChange}
                  aria-label="text alignment"
                >
                  <StyledToggleButton
                    value={TableView.node}
                    aria-label="left aligned"
                  >
                    Node
                  </StyledToggleButton>
                  <StyledToggleButton
                    value={TableView.edge}
                    aria-label="centered"
                  >
                    Edge
                  </StyledToggleButton>
                  <StyledToggleButton
                    value={TableView.network}
                    aria-label="right aligned"
                  >
                    Network
                  </StyledToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <ConfirmationDialog
        open={showError}
        setOpen={setShowError}
        title="Error"
        message={errorMessage}
        onConfirm={() => setShowError(false)}
      />
      <DialogActions>
        <Button
          data-testid="merge-dialog-cancel-button"
          variant="outlined"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Tooltip
          title={mergeTooltipIsOpen ? mergeTooltipText : ''}
          placement="top"
          arrow
        >
          <span>
            <Button
              data-testid="merge-dialog-merge-button"
              variant="contained"
              disabled={mergeTooltipIsOpen}
              onClick={handleMerge}
              sx={{ px: 2.5 }}
            >
              Merge
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
      <ConfirmationDialog
        title={confirmationTitle}
        message={confirmationMessage}
        onConfirm={onConfirmation}
        open={openConfirmation}
        setOpen={setOpenConfirmation}
        buttonTitle="Yes"
      />
    </Dialog>
  )
}

export default MergeDialog
