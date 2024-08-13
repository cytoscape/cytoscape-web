import {
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material'
import React, { useContext, useEffect, useState } from 'react'
import { UnionIcon, DifferenceIcon, IntersectionIcon } from './Icon'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Paper,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  Tooltip,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  IconButton,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
} from '@mui/material'
import './MergeDialog.css'
import { v4 as uuidv4 } from 'uuid'
import {
  MergeType,
  NetworkRecord,
  TableView,
  Pair,
} from '../models/DataInterfaceForMerge'
import useMatchingColumnsStore from '../store/matchingColumnStore'
import useNodeMatchingTableStore from '../store/nodeMatchingTableStore'
import useEdgeMatchingTableStore from '../store/edgeMatchingTableStore'
import useNetMatchingTableStore from '../store/netMatchingTableStore'
import useMergeToolTipStore from '../store/mergeToolTip'
import { Column } from '../../../models/TableModel'
import { IdType } from '../../../models/IdType'
import { useNdexNetwork } from '../../../store/hooks/useNdexNetwork'
import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../store/CredentialStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { createMergedNetworkWithView } from '../models/Impl/CreateMergedNetworkWithView'
import { createMatchingTable } from '../models/Impl/MatchingTableImpl'
import { useLayoutStore } from '../../../store/LayoutStore'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'
import { MatchingTableComp } from './MatchingTableComp'
import { MatchingColumnTable } from './MatchingColumnTable'
import {
  findPairIndex,
  getNetTableFromSummary,
  sortListAlphabetically,
} from '../utils/helper-functions'
import { ConfirmationDialog } from '../../../components/Util/ConfirmationDialog'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'

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
  const { ndexBaseUrl } = useContext(AppConfigContext) // Base URL for the NDEx server
  const [mergeOpType, setMergeOpType] = useState(MergeType.union) // Type of merge operation
  const [mergeWithinNetwork, setMergeWithinNetwork] = useState(true) // Flag to indicate whether to merge within the same network
  const [mergeOnlyNodes, setMergeOnlyNodes] = useState(false) // Flag to indicate whether to ignore type conflicts
  const [mergedNetworkName, setMergedNetworkName] = useState(uniqueName) // Name of the merged network
  const [fullScreen, setFullScreen] = useState(false) // Full screen mode for the dialog
  const [tooltipOpen, setTooltipOpen] = useState(false) // Flag to indicate whether the tooltip is open
  const [strictRemoveMode, setStrictRemoveMode] = useState(false) // Flag to indicate the rules of difference merge
  const [isNameDuplicate, setIsNameDuplicate] = useState(false) // Flag to indicate whether the network name is a duplicate
  const existingNetNames = new Set(workSpaceNetworks.map((pair) => pair[0])) // Set of existing network names
  const mergeTooltipIsOpen = useMergeToolTipStore((state) => state.isOpen)
  const setMergeTooltipIsOpen = useMergeToolTipStore((state) => state.setIsOpen)
  const mergeTooltipText = useMergeToolTipStore((state) => state.text)
  const setMergeTooltipText = useMergeToolTipStore((state) => state.setText)
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
  const updateSummary = useNetworkSummaryStore((state) => state.update)
  const netSummaries = useNetworkSummaryStore((state) => state.summaries)
  const addNewNetwork = useNetworkStore((state) => state.add)
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const setViewModel = useViewModelStore((state) => state.add)
  const setTables = useTableStore((state) => state.add)
  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  // Layout setting using the layout store
  const defaultLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredLayout,
  )
  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )
  const engine: LayoutEngine =
    layoutEngines.find((engine) => engine.name === defaultLayout.engineName) ??
    layoutEngines[0]

  const updateNodePositions: (
    // Function to update node positions after layout is applied
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

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
    for (const net of selectedAvailable) {
      // Load the network data
      let netData = networkRecords[net[1]] // Attempt to use cached data
      if (!netData) {
        netData = await loadNetworkById(net[1]) // Fetch and use fresh data if not available
      }
      newNetworkRecords[net[1]] = netData
      // Set the default matching column for the network
      let hasName = false
      for (const col of netData.nodeTable.columns ?? []) {
        if (col.name === 'name' && col.type === 'string') {
          newMatchingCols[net[1]] = { name: 'name', type: 'string' } as Column
          hasName = true
          break
        }
      }
      if (!hasName) {
        newMatchingCols[net[1]] =
          netData.nodeTable.columns.length > 0
            ? netData.nodeTable.columns[0]
            : ({ name: 'none', type: 'string' } as Column)
      }
    }
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
    setIsNameDuplicate(existingNetNames.has(newName))
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
  useEffect(() => {
    setNetworkRecords(networksLoaded)
    return () => {
      resetNodeMatchingTable()
      resetEdgeMatchingTable()
      resetNetMatchingTable()
      resetMatchingCols()
    }
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
  //utility function to load network by id
  const loadNetworkById = async (networkId: IdType) => {
    const currentToken = await getToken()
    const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken)
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
      const summaryRecord: Record<IdType, NdexNetworkSummary> =
        Object.fromEntries(
          Object.entries(netSummaries).filter(([id]) =>
            toMergeNetworksList.some((pair) => pair[1] === id),
          ),
        )
      const baseNetwork =
        toMergeNetworksList.length > 0 ? toMergeNetworksList[0][1] : ''
      const [newNetworkWithView, networkSummary] =
        await createMergedNetworkWithView(
          [...toMergeNetworksList.map((i) => i[1])],
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
        )

      // Update state stores with the new network and its components
      setCurrentNetworkId(newNetworkId)
      addNetworkToWorkspace(newNetworkId)
      addNewNetwork(newNetworkWithView.network)
      setVisualStyle(newNetworkId, newNetworkWithView.visualStyle)
      setTables(
        newNetworkId,
        newNetworkWithView.nodeTable,
        newNetworkWithView.edgeTable,
      )
      setViewModel(newNetworkId, newNetworkWithView.networkViews[0])
      const newSummary = { ...networkSummary, hasLayout: true }
      // Apply layout to the network
      setIsRunning(true)
      engine.apply(
        newNetworkWithView.network.nodes,
        newNetworkWithView.network.edges,
        (positionMap) => {
          updateNodePositions(newNetworkId, positionMap)
          updateSummary(newNetworkId, newSummary)
          setIsRunning(false)
        },
        defaultLayout,
      )
      handleClose()
    } catch (e) {
      console.error(e)
      setErrorMessage(`An error occurred: ${e.message}`) // Set the error message
      setShowError(true) // Show the error message panel
    }
  }

  return (
    <Dialog
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
            onClick={handleFullScreenToggle}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
            color="inherit"
          >
            {fullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <DialogContent>
        <Box className="toggleButtonGroup">
          <ToggleButtonGroup
            value={mergeOpType}
            exclusive
            onChange={handleMergeTypeChange}
            aria-label="text alignment"
          >
            <ToggleButton
              className="toggleButton"
              classes={{ selected: 'selected' }}
              value={MergeType.union}
              aria-label="left aligned"
            >
              <UnionIcon /> Union
            </ToggleButton>
            <ToggleButton
              className="toggleButton"
              classes={{ selected: 'selected' }}
              value={MergeType.intersection}
              aria-label="centered"
            >
              <IntersectionIcon /> Intersection
            </ToggleButton>
            <ToggleButton
              className="toggleButton"
              classes={{ selected: 'selected' }}
              value={MergeType.difference}
              aria-label="right aligned"
            >
              <DifferenceIcon /> Difference
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {mergeOpType === MergeType.difference && (
          <FormControl
            component="fieldset"
            style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '10px',
              width: '100%',
            }}
          >
            <FormLabel component="legend" style={{ marginBottom: '10px' }}>
              Node Removal Rule
            </FormLabel>
            <RadioGroup
              aria-label="node removal policy"
              value={strictRemoveMode}
              onChange={handleStrictRemoveModeChange}
              name="node-removal-options"
              style={{ marginLeft: '20px' }}
            >
              <FormControlLabel
                value="false" // String value for false
                control={<Radio />}
                label="Only remove nodes if all their edges are being subtracted, too"
                style={{ marginBottom: '5px' }}
              />
              <FormControlLabel
                value="true" // String value for true
                control={<Radio />}
                label="Remove all nodes that are in the second network"
              />
            </RadioGroup>
          </FormControl>
        )}

        <Typography variant="h6" style={{ margin: '20px 0' }}>
          Select Networks to Merge:
        </Typography>

        <Box display="flex" justifyContent="space-between" p={2}>
          <Paper style={{ width: '42.5%' }}>
            <ListSubheader className="listSubheader" component="div">
              Available Networks
            </ListSubheader>
            <List className="scrollableList" component="div">
              {availableNetworksList.map((network, index) => (
                <ListItem
                  button
                  selected={selectedAvailable.includes(network)}
                  onClick={() => handleSelectAvailable(network[1])}
                  key={index}
                >
                  <ListItemText primary={network[0]} />
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
            <Button
              className="arrowButton"
              variant="contained"
              onClick={handleAddNetwork}
              disabled={selectedAvailable.length === 0}
              size="small"
            >
              <ArrowForwardIcon className="arrowIcon" fontSize="small" />
            </Button>
            <Button
              className="arrowButton"
              variant="contained"
              onClick={handleRemoveNetwork}
              disabled={selectedToMerge.length === 0}
              sx={{ mt: 1 }}
              size="small"
            >
              <ArrowBackIcon className="arrowIcon" fontSize="small" />
            </Button>
          </Box>
          <Paper style={{ width: '42.5%' }}>
            <ListSubheader className="listSubheader" component="div">
              Networks to Merge
            </ListSubheader>
            <List className="scrollableList" component="div">
              {toMergeNetworksList.map((network, index) => (
                <ListItem
                  button
                  selected={selectedToMerge.includes(network)}
                  onClick={() => handleSelectToMerge(network[1])}
                  key={index}
                >
                  <ListItemText
                    primary={
                      <>
                        {network[0]}
                        {index === 0 && (
                          <Tooltip
                            title={`This is the base network`}
                            placement="top"
                            arrow
                          >
                            <StarIcon
                              viewBox="0 -3.7 24 24"
                              style={{ color: 'gold' }}
                            />
                          </Tooltip>
                        )}
                      </>
                    }
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
            <Button
              className="arrowButton"
              variant="contained"
              onClick={handleMoveUp}
              disabled={selectedToMerge.length === 0}
              size="small"
            >
              <ArrowUpwardIcon className="arrowIcon" fontSize="small" />
            </Button>
            <Button
              className="arrowButton"
              variant="contained"
              onClick={handleMoveDown}
              disabled={selectedToMerge.length === 0}
              sx={{ mt: 1 }}
              size="small"
            >
              <ArrowDownwardIcon className="arrowIcon" fontSize="small" />
            </Button>
          </Box>
        </Box>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Advanced Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="h6" style={{ margin: '5px 0 5px 0' }}>
              Merged Network Name:
            </Typography>
            <TextField
              label="Enter merged network name"
              value={mergedNetworkName}
              onChange={handleNameChange}
              fullWidth
              margin="normal"
              InputProps={{
                style: { color: isNameDuplicate ? 'orange' : 'inherit' },
              }}
            />
            {isNameDuplicate && (
              <Typography color="orange">
                Warning: A network with this name already exists in your
                workspace.
              </Typography>
            )}
            <Typography variant="h6" style={{ margin: '5px 0 10px 0' }}>
              Matching columns:
            </Typography>

            <MatchingColumnTable
              networkRecords={networkRecords}
              toMergeNetworksList={toMergeNetworksList}
              matchingCols={matchingCols}
            />

            <Typography variant="h6" style={{ margin: '10px 0 10px 0' }}>
              How to merge columns:
            </Typography>
            {tableView !== null && (
              <MatchingTableComp
                networkRecords={networkRecords}
                netLst={toMergeNetworksList}
                tableView={tableView}
                mergeOpType={mergeOpType}
              />
            )}

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <Box className="toggleButtonGroup">
                <ToggleButtonGroup
                  value={tableView}
                  exclusive
                  onChange={handleTableViewChange}
                  aria-label="text alignment"
                >
                  <ToggleButton
                    className="toggleButton"
                    classes={{ selected: 'selected' }}
                    value={TableView.node}
                    aria-label="left aligned"
                  >
                    Node
                  </ToggleButton>
                  <ToggleButton
                    className="toggleButton"
                    classes={{ selected: 'selected' }}
                    value={TableView.edge}
                    aria-label="centered"
                  >
                    Edge
                  </ToggleButton>
                  <ToggleButton
                    className="toggleButton"
                    classes={{ selected: 'selected' }}
                    value={TableView.network}
                    aria-label="right aligned"
                  >
                    Network
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </div>
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="left"
              m={1}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={mergeWithinNetwork}
                    onChange={() => setMergeWithinNetwork(!mergeWithinNetwork)}
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
                      onChange={() => setMergeOnlyNodes(!mergeOnlyNodes)}
                      name="mergeOnlyNodes"
                      color="primary"
                      disabled={MergeType.intersection !== mergeOpType}
                    />
                  }
                  label="Merge only nodes and ignore edges"
                />
              </Tooltip>
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
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        {mergeTooltipIsOpen ? (
          <Tooltip title={mergeTooltipText} placement="top" arrow>
            <span>
              <Button color="primary" disabled={true}>
                Merge
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button onClick={handleMerge} color="primary">
            Merge
          </Button>
        )}
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
