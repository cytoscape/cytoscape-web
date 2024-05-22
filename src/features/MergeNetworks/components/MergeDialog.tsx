import {
    ArrowForward as ArrowForwardIcon, ArrowBack as ArrowBackIcon,
    ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon,
    ExpandMore as ExpandMoreIcon, Star as StarIcon,
    Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import React, { useContext, useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, List, ListItem, ListItemText, ListSubheader,
    Paper, FormControlLabel, Checkbox, ToggleButtonGroup, Tooltip,
    ToggleButton, Accordion, AccordionSummary, AccordionDetails, TextField, IconButton,
} from '@mui/material';
import './MergeDialog.css';
import { v4 as uuidv4 } from 'uuid';
import {
    MergeType, NetworkRecord, TableView, Pair
} from '../models/DataInterfaceForMerge';
import { MatchingTableRow } from '../models/MatchingTable';
import { Column, ValueType } from '../../../models/TableModel';
import { IdType } from '../../../models/IdType';
import { useNdexNetwork } from '../../../store/hooks/useNdexNetwork';
import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../store/CredentialStore';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useViewModelStore } from '../../../store/ViewModelStore';
import { useNetworkStore } from '../../../store/NetworkStore';
import { TableRecord, useTableStore } from '../../../store/TableStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { createMergedNetworkWithView } from '../models/Impl/CreateMergedNetworkWithView';
import { createMatchingTable } from '../models/Impl/MatchingTableImpl';
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel';
import { useLayoutStore } from '../../../store/LayoutStore';
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel';
import { MatchingTableComp } from './MatchingTableComp';
import { MatchingColumnTable } from './MatchingColumnTable';
import { NetworkWithView } from '../../../utils/cx-utils';
import { findPairIndex, getNetTableFromSummary, processColumns } from '../utils/helper-functions';
import { ConfirmationDialog } from '../../../components/Util/ConfirmationDialog';
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore';
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel';
import { generateUniqueName } from '../../../utils/network-utils';

interface MergeDialogProps {
    open: boolean;
    handleClose: () => void;
    workSpaceNetworks: Pair<string, IdType>[];
}

const MergeDialog: React.FC<MergeDialogProps> = ({ open, handleClose, workSpaceNetworks }): React.ReactElement => {
    const [readyToMerge, setReadyToMerge] = useState(false);// Flag to indicate whether it is ready to merge
    const [tableView, setTableView] = useState(TableView.node); // Current table view
    const [errorMessage, setErrorMessage] = useState(''); // Error message to display
    const [showError, setShowError] = useState(false); // Flag to show the error message panel
    const { ndexBaseUrl } = useContext(AppConfigContext); // Base URL for the NDEx server
    const [mergeOpType, setMergeOpType] = useState(MergeType.union); // Type of merge operation
    const [typeConflict, setTypeConflict] = useState(false); // Flag to indicate whether there is a type conflict
    const [mergedNetworkName, setMergedNetworkName] = useState('Merged Network'); // Name of the merged network
    const [fullScreen, setFullScreen] = useState(false); // Full screen mode for the dialog
    // Record the visual style of the networks to be merged
    const [visualStyleRecord, setvisualStyleRecord] = useState<Record<IdType, VisualStyle>>({});
    // Record the information of the networks to be merged
    const [networkRecords, setNetworkRecords] = useState<Record<IdType, NetworkRecord>>({});
    // Record the matching columns for each network
    const [matchingCols, setMatchingCols] = useState<Record<IdType, Column>>({});
    // Record the state of the matching table
    const [nodeMatchingTable, setNodeMatchingTable] = useState<MatchingTableRow[]>([]);
    const [edgeMatchingTable, setEdgeMatchingTable] = useState<MatchingTableRow[]>([]);
    const [netMatchingTable, setNetMatchingTable] = useState<MatchingTableRow[]>([]);
    // Record the status of the available and selected networks lists
    const [availableNetworksList, setAvailableNetworksList] = useState<Pair<string, IdType>[]>(workSpaceNetworks);
    const [toMergeNetworksList, setToMergeNetworksList] = useState<Pair<string, IdType>[]>([]);
    const [selectedAvailable, setSelectedAvailable] = useState<Pair<string, IdType>[]>([]);
    const [selectedToMerge, setSelectedToMerge] = useState<Pair<string, IdType>[]>([]);
    // Initialize the matching tables
    const nodeMatchingTableObj = createMatchingTable(nodeMatchingTable);
    const edgeMatchingTableObj = createMatchingTable(edgeMatchingTable);
    const netMatchingTableObj = createMatchingTable(netMatchingTable);
    // Functions relying on store hooks
    const netSummaries = useNetworkSummaryStore((state) => state.summaries);
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

    const updateNodePositions: ( // Function to update node positions after layout is applied
        networkId: IdType,
        positions: Map<IdType, [number, number, number?]>,
    ) => void = useViewModelStore((state) => state.updateNodePositions)

    // Functions to select networks to merge or undo the selection
    const handleSelectAvailable = (uuid: string) => {
        const currentIndex = findPairIndex(selectedAvailable, uuid);
        const newSelectedAvailable = [...selectedAvailable];

        if (currentIndex === -1) {
            // Find the full pair in the available networks list and add it
            const pairToAdd = availableNetworksList.find(pair => pair[1] === uuid);
            if (pairToAdd) newSelectedAvailable.push(pairToAdd);
        } else {
            newSelectedAvailable.splice(currentIndex, 1);
        }

        setSelectedAvailable(newSelectedAvailable);
    };

    const handleSelectToMerge = (uuid: string) => {
        const currentIndex = findPairIndex(selectedToMerge, uuid);
        const newSelectedToMerge = [...selectedToMerge];

        if (currentIndex === -1) {
            // Find the full pair in the selected networks list and add it
            const pairToAdd = toMergeNetworksList.find(pair => pair[1] === uuid);
            if (pairToAdd) newSelectedToMerge.push(pairToAdd);
        } else {
            newSelectedToMerge.splice(currentIndex, 1);
        }

        setSelectedToMerge(newSelectedToMerge);
    };
    // Function to add selected networks to the 'Networks to Merge' list
    const handleAddNetwork = async () => {
        const newAvailableNetworksList = [...availableNetworksList];
        const newMatchingCols = { ...matchingCols };
        for (const net of selectedAvailable) {
            // Load the network data
            // Todo: check if the network is already loaded in the workspace
            let netData = networkRecords[net[1]];  // Attempt to use cached data
            if (!netData) {
                netData = await loadNetworkById(net[1]);  // Fetch and use fresh data if not available
                const netIndex = newAvailableNetworksList.findIndex(n => n[1] === net[1]);
                if (netIndex > -1) {
                    newAvailableNetworksList.splice(netIndex, 1);
                }
            }
            // Set the default matching column for the network
            let hasName = false;
            for (const col of netData.nodeTable.columns ?? []) {
                if (col.name === 'name' && col.type === 'string') {
                    newMatchingCols[net[1]] = { name: 'name', type: 'string' } as Column;
                    hasName = true;
                    break;
                }
            }

            if (!hasName) {
                newMatchingCols[net[1]] = netData.nodeTable.columns.length > 0 ? netData.nodeTable.columns[0] : ({ name: 'none', type: 'string' } as Column);
            }
        }
        setToMergeNetworksList([...toMergeNetworksList, ...selectedAvailable]);
        setAvailableNetworksList(availableNetworksList.filter(net => !selectedAvailable.includes(net)));
        setMatchingCols(newMatchingCols);
        setSelectedAvailable([]);
    };
    // Function to remove selected networks from the 'Networks to Merge' list
    const handleRemoveNetwork = () => {
        setAvailableNetworksList([...availableNetworksList, ...selectedToMerge]);
        setToMergeNetworksList(toMergeNetworksList.filter(net => !selectedToMerge.includes(net)));
        //Todo: whether to delete all these information or not
        const newNetworkRecords = { ...networkRecords };
        const newMatchingCols = { ...matchingCols };
        const newVisualStyles = { ...visualStyleRecord };
        selectedToMerge.forEach(net => {
            delete newNetworkRecords[net[1]];
            delete newMatchingCols[net[1]];
            delete newVisualStyles[net[1]];
        });
        setNetworkRecords(newNetworkRecords);
        setMatchingCols(newMatchingCols);
        setvisualStyleRecord(newVisualStyles);
        setSelectedToMerge([]);
    };

    // Function to move selected networks up
    const handleMoveUp = () => {
        const newToMergeNetworksList = [...toMergeNetworksList];
        // Retrieve the current indices of the selected networks and sort them in ascending order for moving up
        const sortedSelected = selectedToMerge
            .map(selected => newToMergeNetworksList.findIndex(network => network[1] === selected[1]))
            .sort((a, b) => a - b);

        sortedSelected.forEach(currentIndex => {
            if (currentIndex > 0 && !selectedToMerge.some(net => net[1] === newToMergeNetworksList[currentIndex - 1][1])) {
                const temp = newToMergeNetworksList[currentIndex - 1];
                newToMergeNetworksList[currentIndex - 1] = newToMergeNetworksList[currentIndex];
                newToMergeNetworksList[currentIndex] = temp;
            }
        });

        setToMergeNetworksList(newToMergeNetworksList);
    };
    // Function to move selected networks down
    const handleMoveDown = () => {
        const newToMergeNetworksList = [...toMergeNetworksList];
        // Retrieve the current indices of the selected networks and sort them in descending order for moving down
        const sortedSelected = selectedToMerge
            .map(selected => newToMergeNetworksList.findIndex(network => network[1] === selected[1]))
            .sort((a, b) => b - a);

        sortedSelected.forEach(currentIndex => {
            if (currentIndex < newToMergeNetworksList.length - 1 && !selectedToMerge.some(net => net[1] === newToMergeNetworksList[currentIndex + 1][1])) {
                const temp = newToMergeNetworksList[currentIndex + 1];
                newToMergeNetworksList[currentIndex + 1] = newToMergeNetworksList[currentIndex];
                newToMergeNetworksList[currentIndex] = temp;
            }
        });

        setToMergeNetworksList(newToMergeNetworksList);
    };
    // Function to handle changes in the merged network name
    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMergedNetworkName(event.target.value);
    };
    // Function to handle switch in the matching table view
    const handleTableViewChange = (event: React.MouseEvent<HTMLElement>, newTableView: TableView) => {
        if (newTableView !== null) {
            setTableView(newTableView);
        }
    };

    // Update the matching table when selectedNetworks changes
    useEffect(() => {
        // Create the initial matching table with the columns of the base network
        const baseNetwork = toMergeNetworksList.length > 0 ? toMergeNetworksList[0] : null;
        const matchingType = baseNetwork ? (networkRecords[baseNetwork[1]]?.nodeTable?.columns.find(col => col.name === matchingCols[baseNetwork[1]]?.name)?.type || 'None') : 'None';
        let matchingColsConflicts = 0;
        const initialRow = {
            id: 0,
            mergedNetwork: 'Matching.Attribute',
            type: matchingType
        }
        const matchingRow: Record<string, string> = {};
        Object.keys(matchingCols).forEach(key => {
            matchingRow[key] = matchingCols[key].name;
            if (matchingCols[key].type !== matchingType) matchingColsConflicts += 1;
        });
        const newNodeMatchingTable: MatchingTableRow[] = [{ ...initialRow, ...matchingRow, numConflicts: matchingColsConflicts } as MatchingTableRow]

        // Update the matching table for each network
        setNodeMatchingTable(processColumns('nodeTable', toMergeNetworksList, networkRecords, newNodeMatchingTable));
        setEdgeMatchingTable(processColumns('edgeTable', toMergeNetworksList, networkRecords));
        setNetMatchingTable(processColumns('netTable', toMergeNetworksList, networkRecords));

        // check whether it is ready to merge
        if (toMergeNetworksList.length > 0) {
            let isReady = true
            toMergeNetworksList.forEach((net) => {
                if (!networkRecords[net[1]]?.nodeTable?.columns.some(col => col.name === matchingCols[net[1]].name && col.type === matchingCols[net[1]].type)) {
                    isReady = false
                }
            })
            setReadyToMerge(isReady);
        } else {
            setReadyToMerge(false);
        }
    }, [toMergeNetworksList, matchingCols, networkRecords]);

    // set merge type
    const handleMergeTypeChange = (event: React.MouseEvent<HTMLElement>, opType: string) => {
        if (opType !== null) {
            setMergeOpType(opType as MergeType);
        }
    };

    //utility function to get token
    const getToken: () => Promise<string> = useCredentialStore(
        (state) => state.getToken,
    )
    //utility function to load network by id
    const loadNetworkById = async (networkId: IdType) => {
        const currentToken = await getToken();
        const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken);
        const { network, nodeTable, edgeTable, visualStyle } = res;
        const summary = netSummaries[networkId];
        const netTable = getNetTableFromSummary(summary)
        setNetworkRecords(prev => ({
            ...prev,
            [networkId]: { network, nodeTable, edgeTable, netTable }
        }));
        setvisualStyleRecord(prev => ({
            ...prev,
            [networkId]: visualStyle
        }));
        return { network, nodeTable, edgeTable, netTable };
    }

    // Handler for the 'Merge' button
    const handleMerge = async (): Promise<void> => {
        try {
            const newNetworkId = uuidv4();
            const networkName = generateUniqueName(workSpaceNetworks.map(net => net[0]), mergedNetworkName);
            const summaryRecord: Record<IdType, NdexNetworkSummary> = Object.fromEntries(Object.entries(netSummaries).filter(([id,]) => toMergeNetworksList.some(pair => pair[1] === id)));
            const baseNetwork = toMergeNetworksList.length > 0 ? toMergeNetworksList[0][1] : '';
            const newNetworkWithView: NetworkWithView = await createMergedNetworkWithView([...toMergeNetworksList.map(i => i[1])],
                newNetworkId, networkName, networkRecords, nodeMatchingTableObj, edgeMatchingTableObj, netMatchingTableObj,
                matchingCols, visualStyleRecord[baseNetwork], summaryRecord);

            // Update state stores with the new network and its components   
            setCurrentNetworkId(newNetworkId);
            addNetworkToWorkspace(newNetworkId);
            addNewNetwork(newNetworkWithView.network);
            setVisualStyle(newNetworkId, newNetworkWithView.visualStyle);
            setTables(newNetworkId, newNetworkWithView.nodeTable, newNetworkWithView.edgeTable);
            setViewModel(newNetworkId, newNetworkWithView.networkViews[0]);

            // Apply layout to the network
            setIsRunning(true)
            engine.apply(newNetworkWithView.network.nodes,
                newNetworkWithView.network.edges, (positionMap) => {
                    updateNodePositions(newNetworkId, positionMap);
                    setIsRunning(false);
                }, defaultLayout)
            handleClose();
        } catch (e) {
            console.error(e)
            setErrorMessage(`An error occurred: ${e.message}`);  // Set the error message
            setShowError(true); // Show the error message panel
        }
    };

    return (
        <Dialog fullScreen={fullScreen} maxWidth="md" fullWidth={true} open={open} onClose={handleClose}>
            <Box display="flex" alignItems="center" justifyContent="space-between" paddingRight={1} paddingLeft={1}>
                <DialogTitle>Advanced Network Merge</DialogTitle>
                {fullScreen ? (
                    <IconButton onClick={() => setFullScreen(false)} color="inherit">
                        <Tooltip title="Exit Fullscreen" placement="bottom">
                            <FullscreenExitIcon />
                        </Tooltip>
                    </IconButton>

                ) : (
                    <IconButton onClick={() => setFullScreen(true)} color="inherit">
                        <Tooltip title="Fullscreen" placement="top">
                            <FullscreenIcon />
                        </Tooltip>
                    </IconButton>
                )}
            </Box>
            <DialogContent>
                <Box className="toggleButtonGroup">
                    <ToggleButtonGroup
                        value={mergeOpType} exclusive onChange={handleMergeTypeChange} aria-label="text alignment" >
                        <ToggleButton className="toggleButton" classes={{ selected: 'selected' }} value={MergeType.union} aria-label="left aligned">
                            Union
                        </ToggleButton>
                        <ToggleButton className="toggleButton" classes={{ selected: 'selected' }} value={MergeType.intersection} aria-label="centered">
                            Intersection
                        </ToggleButton>
                        <ToggleButton className="toggleButton" classes={{ selected: 'selected' }} value={MergeType.difference} aria-label="right aligned">
                            Difference
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
                <Typography variant="h6" style={{ margin: '20px 0' }}>
                    Select Networks to Merge:
                </Typography>

                <Box display="flex" justifyContent="space-between" p={2}>
                    <List
                        subheader={<ListSubheader>Available Networks</ListSubheader>}
                        component={Paper}
                        style={{ width: '42.5%', maxHeight: 300, overflow: 'auto' }}
                    >
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
                    <Box display="flex" flexDirection="column" justifyContent="center" m={1}>
                        <Button className="arrowButton" variant="contained" onClick={handleAddNetwork} disabled={selectedAvailable.length === 0} size='small'>
                            <ArrowForwardIcon className="arrowIcon" fontSize="small" />
                        </Button>
                        <Button className="arrowButton" variant="contained" onClick={handleRemoveNetwork} disabled={selectedToMerge.length === 0} sx={{ mt: 1 }} size='small'>
                            <ArrowBackIcon className="arrowIcon" fontSize="small" />
                        </Button>
                    </Box>
                    <List
                        subheader={<ListSubheader>Networks to Merge</ListSubheader>}
                        component={Paper}
                        style={{ width: '42.5%', maxHeight: 300, overflow: 'auto' }}
                    >
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
                                            {index === 0 && <Tooltip title={`This is the base network`} placement="top" arrow>
                                                <StarIcon viewBox="0 -3.7 24 24" style={{ color: 'gold' }} />
                                            </Tooltip>}
                                        </>
                                    } />
                            </ListItem>
                        ))}
                    </List>
                    <Box display="flex" flexDirection="column" justifyContent="center" m={1}>
                        <Button className="arrowButton" variant="contained" onClick={handleMoveUp} disabled={selectedToMerge.length === 0} size='small'>
                            <ArrowUpwardIcon className="arrowIcon" fontSize="small" />
                        </Button>
                        <Button className="arrowButton" variant="contained" onClick={handleMoveDown} disabled={selectedToMerge.length === 0} sx={{ mt: 1 }} size='small'>
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
                        />
                        <Typography variant="h6" style={{ margin: '5px 0 10px 0' }}>
                            Matching columns:
                        </Typography>

                        <MatchingColumnTable networkRecords={networkRecords} toMergeNetworksList={toMergeNetworksList}
                            matchingCols={matchingCols} setMatchingCols={setMatchingCols} />

                        <Typography variant="h6" style={{ margin: '10px 0 10px 0' }}>
                            How to merge columns:
                        </Typography>
                        {tableView !== null && (
                            <MatchingTableComp
                                networkRecords={networkRecords}
                                netLst={toMergeNetworksList}
                                data={
                                    tableView === TableView.node
                                        ? nodeMatchingTable
                                        : tableView === TableView.edge
                                            ? edgeMatchingTable
                                            : netMatchingTable
                                }
                                type={tableView}
                                setNodeMatchingTable={setNodeMatchingTable}
                                setEdgeMatchingTable={setEdgeMatchingTable}
                                setNetMatchingTable={setNetMatchingTable}
                                setMatchingCols={setMatchingCols}
                                matchingCols={matchingCols}
                            />
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <Box className="toggleButtonGroup">
                                <ToggleButtonGroup value={tableView} exclusive onChange={handleTableViewChange} aria-label="text alignment">
                                    <ToggleButton className="toggleButton" classes={{ selected: 'selected' }} value={TableView.node} aria-label="left aligned">
                                        Node
                                    </ToggleButton>
                                    <ToggleButton className="toggleButton" classes={{ selected: 'selected' }} value={TableView.edge} aria-label="centered">
                                        Edge
                                    </ToggleButton>
                                    <ToggleButton className="toggleButton" classes={{ selected: 'selected' }} value={TableView.network} aria-label="right aligned">
                                        Network
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        </div>
                    </AccordionDetails>
                </Accordion>
            </DialogContent>
            <ConfirmationDialog
                open={showError} setOpen={setShowError} title="Error"
                message={errorMessage} onConfirm={() => setShowError(false)}
            />
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleMerge} color="secondary" disabled={!readyToMerge}>
                    Merge
                </Button>
            </DialogActions>
        </Dialog >
    );
};

export default MergeDialog;
