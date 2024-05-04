import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Select,
    MenuItem, Typography, Box, List, ListItem, ListItemText, ListSubheader,
    Paper, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
    FormControl, InputLabel, FormControlLabel, Checkbox, TextField, ToggleButtonGroup,
    ToggleButton, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import './MergeDialog.css';
import { v4 as uuidv4 } from 'uuid';
import { initial, merge, set } from 'lodash';
import { MergeType, NetworkRecord, MatchingTableRow } from '../model/DataInterfaceForMerge';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Column } from '../../../models/TableModel';
import { IdType } from '../../../models/IdType';
import { useNdexNetwork } from '../../../store/hooks/useNdexNetwork';
import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../store/CredentialStore';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column as PrimeColumn } from 'primereact/column';
import { PrimeReactProvider } from 'primereact/api';
import { Pair } from '../../../models/MergeModel/utils/Pair';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useViewModelStore } from '../../../store/ViewModelStore';
import { useNetworkStore } from '../../../store/NetworkStore';
import { useTableStore } from '../../../store/TableStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { NetworkView } from '../../../models/ViewModel'
import { Network } from '../../../models/NetworkModel';
import { createMergedNetworkWithView } from '../createMergedNetworkWithView';
import { MatchingTable } from '../model/Impl/MatchingTable';
import { VisualStyle } from '../../../models/VisualStyleModel';
import { useLayoutStore } from '../../../store/LayoutStore';
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel';

interface MergeDialogProps {
    open: boolean;
    handleClose: () => void;
    workSpaceNetworks: Pair<string, IdType>[];
}

const MergeDialog: React.FC<MergeDialogProps> = ({ open, handleClose, workSpaceNetworks }): React.ReactElement => {
    const [tableView, setTableView] = useState('node');
    const { ndexBaseUrl } = useContext(AppConfigContext);
    const [mergeOpType, setMergeOpType] = useState(MergeType.union);
    // Record the information of the networks to be merged
    const [networkRecords, setNetworkRecords] = useState<Record<IdType, NetworkRecord>>({});
    // Record the matching columns for each network
    const [matchingCols, setmatchingCols] = useState<Record<IdType, Column>>({});
    // Record the state of the matching table
    const [nodeMatchingTable, setNodeMatchingTable] = useState<MatchingTableRow[]>([]);
    const [edgeMatchingTable, setEdgeMatchingTable] = useState<MatchingTableRow[]>([]);
    const [netMatchingTable, setNetMatchingTable] = useState<MatchingTableRow[]>([]);
    // Record the status of the available and selected networks lists
    const [availableNetworksList, setAvailableNetworksList] = useState<Pair<string, IdType>[]>(workSpaceNetworks);
    const [toMergeNetworksList, setToMergeNetworksList] = useState<Pair<string, IdType>[]>([]);
    const [selectedAvailable, setSelectedAvailable] = useState<Pair<string, IdType>[]>([]);
    const [selectedToMerge, setSelectedToMerge] = useState<Pair<string, IdType>[]>([]);
    const matchingTableRef = useRef<HTMLDivElement>(null);

    const nodeMatchingTableObj = new MatchingTable(nodeMatchingTable);
    const edgeMatchingTableObj = new MatchingTable(edgeMatchingTable);
    const netMatchingTableObj = new MatchingTable(netMatchingTable);
    // store
    const addNewNetwork = useNetworkStore((state) => state.add)
    const setVisualStyle = useVisualStyleStore((state) => state.add)
    const setViewModel = useViewModelStore((state) => state.add)
    const setTables = useTableStore((state) => state.add)
    const visualStyle: VisualStyle = useVisualStyleStore((state) => state.visualStyles[toMergeNetworksList.length > 0 ? toMergeNetworksList[0][1] : ''])
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

    // Retrieve the current network ,and its id, view model, tables and visual style
    const currentNetworkId: IdType = useWorkspaceStore(
        (state) => state.workspace.currentNetworkId,
    )
    const currentNetwork: Network | undefined = useNetworkStore(
        (state) => state.networks.get(currentNetworkId)
    );
    const networkViewModel: NetworkView | undefined = useViewModelStore(
        (state) => state.getViewModel(currentNetworkId)
    )
    const tables = useTableStore((state) => state.tables[currentNetworkId]);

    // select networks to merge
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

    const handleAddNetwork = async () => {
        const newAvailableNetworksList = [...availableNetworksList];

        for (const net of selectedAvailable) {
            if (!networkRecords.hasOwnProperty(net[1])) {
                await loadNetworkById(net[1]);
                const netIndex = newAvailableNetworksList.findIndex(n => n[1] === net[1]);
                if (netIndex > -1) {
                    newAvailableNetworksList.splice(netIndex, 1);
                }
            }
        }
        setToMergeNetworksList([...toMergeNetworksList, ...selectedAvailable]);
        setAvailableNetworksList(availableNetworksList.filter(net => !selectedAvailable.includes(net)));
        setSelectedAvailable([]);
    };

    const handleRemoveNetwork = () => {
        setAvailableNetworksList([...availableNetworksList, ...selectedToMerge]);
        setToMergeNetworksList(toMergeNetworksList.filter(net => !selectedToMerge.includes(net)));
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

    const getToken: () => Promise<string> = useCredentialStore(
        (state) => state.getToken,
    )

    // Handler for the 'Matching Columns' dropdown changes
    const handleSetMatchingCols = (networkId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setmatchingCols({
            ...matchingCols,
            [networkId]: {
                name: event.target.value,
                type: networkRecords[networkId]?.nodeTable?.columns.find(col => col.name === event.target.value)?.type || 'None'
            } as Column
        });
    };

    // Update the matching table when selectedNetworks changes
    useEffect(() => {
        const sharedColsRecord: Record<IdType, string[]> = {};
        // Create the initial matching table with the columns of the base network
        const baseNetwork = toMergeNetworksList.length > 0 ? toMergeNetworksList[0] : null;
        const initialRow: MatchingTableRow = {
            id: 0,
            mergedNetwork: 'Matching.Attribute',
            type: baseNetwork ? (networkRecords[baseNetwork[1]]?.nodeTable?.columns.find(col => col.name === matchingCols[baseNetwork[1]]?.name)?.type || 'None') : 'None'
        }
        const matchingRow: Record<string, string> = {};
        Object.keys(matchingCols).forEach(key => {
            matchingRow[key] = matchingCols[key].name;
        });
        const newMatchingTable = [{ ...initialRow, ...matchingRow }]
        // Loop over networks and update the matching table for each network
        if (baseNetwork !== null) {
            // Loop over networks and update the matching table for each network
            toMergeNetworksList.forEach((net1, index1) => {
                networkRecords[net1[1]]?.nodeTable?.columns.forEach(col => {
                    if (!sharedColsRecord[net1[1]]?.includes(col.name)) {
                        const matchCols: Record<string, string> = {};
                        matchCols[net1[1]] = col.name;

                        toMergeNetworksList.slice(0, index1)?.forEach(net2 => {
                            matchCols[net2[1]] = 'None';
                        });
                        toMergeNetworksList.slice(index1 + 1).forEach(net2 => {
                            const network = networkRecords[net1[1]];
                            if (network?.nodeTable?.columns.some(nc => nc.name === col.name)) {
                                const newSharedCols = sharedColsRecord[net2[1]] ? [...sharedColsRecord[net2[1]]] : [];
                                newSharedCols.push(col.name);
                                sharedColsRecord[net2[1]] = newSharedCols;
                                matchCols[net2[1]] = col.name;
                            } else {
                                matchCols[net2[1]] = 'None';
                            }
                        });

                        newMatchingTable.push({
                            id: newMatchingTable.length,
                            ...matchCols,
                            mergedNetwork: col.name,
                            type: col.type,
                        });
                    }
                });
            });
            setNodeMatchingTable(newMatchingTable);
        }
    }, [toMergeNetworksList, matchingCols, networkRecords]);

    // set merge type
    const handleMergeTypeChange = (event: React.MouseEvent<HTMLElement>, opType: string) => {
        setMergeOpType(opType as MergeType);
    };

    //utility function to load network by id
    const loadNetworkById = async (networkId: IdType): Promise<void> => {
        const currentToken = await getToken();
        const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken);
        const { network, nodeTable, edgeTable } = res;

        setNetworkRecords(prev => ({
            ...prev,
            [networkId]: { network, nodeTable, edgeTable }
        }));
    }

    //utility function to find index of a pair in a list
    const findPairIndex = (pairs: Pair<string, string>[], uuid: string) => {
        return pairs.findIndex(pair => pair[1] === uuid);
    };

    // Editable cell template for the 'Network' columns
    const networkColumnTemplate = (rowData: { [x: string]: any; }, column: { field: string; }) => {
        const emptyOption = { label: 'None', value: 'None' };
        const networkOptions = [
            ...networkRecords[column.field]?.nodeTable?.columns.map(nc => ({ label: nc.name, value: nc.name })),
            emptyOption]
        return (
            <div style={{ maxHeight: 50 }}>
                <Dropdown
                    value={rowData[column.field] === 'None' ? '' : rowData[column.field]}
                    options={networkOptions}
                    onChange={(e) => onDropdownChange(e, rowData, column.field)}
                    appendTo='self'
                />
            </div>
        );
    };

    // Editable cell template for the 'Merged Network' column
    const mergedNetworkTemplate = (rowData: { [x: string]: any; }) => {
        const [isFocused, setIsFocused] = useState(false);
        return (
            <TextField
                type="text"
                value={rowData.mergedNetwork}
                style={{
                    border: '0 solid transparent',
                    outline: 'none'
                }}
                onChange={(e) => onMergedNetworkChange(e, rowData)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                variant="outlined"
                fullWidth
            />
        );
    };
    // Handler for 'Dropdown' changes
    const onDropdownChange = (e: DropdownChangeEvent, rowData: { [x: string]: any; }, field: string) => {
        setNodeMatchingTable(prevTable => {
            const updatedTable = prevTable.map(row => {
                if (row.id === rowData.id) {
                    return { ...row, [field]: e.value };
                }
                return row;
            });

            // Filter out rows where all network fields are 'None'
            return updatedTable.filter(row => {
                // Check all network IDs in the row except the 'mergedNetwork' and 'type' fields
                const allNone = Object.keys(row)
                    .filter(key => key !== 'mergedNetwork' && key !== 'type' && key !== 'id')
                    .every(key => row[key] === 'None');
                return !allNone;  // Keep rows that do not have all 'None'
            });
        });
    };

    // Handler for 'Merged Network' changes
    const onMergedNetworkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, rowData: { [x: string]: any; }) => {
        setNodeMatchingTable(prevTable => prevTable.map(row =>
            row.id === rowData.id ? { ...row, mergedNetwork: e.target.value } : row
        ));
    };

    // Handler for the 'Merge' button
    const handleMerge = async (): Promise<void> => {
        console.log('Merging Networks...');
        console.log('Merge Type:', mergeOpType);
        console.log('Selected Networks:', toMergeNetworksList);
        console.log('Matching Columns:', matchingCols);
        console.log('Matching Table:', nodeMatchingTable);
        const newNetworkId = uuidv4()
        const newNetworkWithView = await createMergedNetworkWithView([...toMergeNetworksList.map(i => i[1])],
            newNetworkId, networkRecords, nodeMatchingTableObj, edgeMatchingTableObj, netMatchingTableObj, matchingCols, visualStyle)

        // Update state stores with the new network and its components   
        addNetworkToWorkspace(newNetworkId);
        addNewNetwork(newNetworkWithView.network);
        setVisualStyle(newNetworkId, newNetworkWithView.visualStyle);
        setTables(newNetworkId, newNetworkWithView.nodeTable, newNetworkWithView.edgeTable);
        setViewModel(newNetworkId, newNetworkWithView.networkViews[0]);
        setCurrentNetworkId(newNetworkId);

        // Apply layout to the network
        setIsRunning(true)
        engine.apply(newNetworkWithView.network.nodes,
            newNetworkWithView.network.edges, (positionMap) => {
                updateNodePositions(newNetworkId, positionMap);
                setIsRunning(false);
            }, defaultLayout)
        handleClose();
    };

    return (
        <Dialog
            maxWidth="md"
            fullWidth={true}
            open={open}
            onClose={handleClose}
        >
            <DialogTitle>Advanced Network Merge</DialogTitle>
            <DialogContent>
                <Box className="toggleButtonGroup">
                    <ToggleButtonGroup
                        value={mergeOpType}
                        exclusive
                        onChange={handleMergeTypeChange}
                        aria-label="text alignment"
                    >
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
                <Box display="flex" flexDirection="row" justifyContent="right" m={1}>
                    <Button variant="contained" onClick={handleMoveUp} disabled={selectedToMerge.length === 0} size='small'
                        className="buttonBase buttonMarginRight" >
                        <ArrowUpwardIcon fontSize="small" />
                    </Button>
                    <Button variant="contained" onClick={handleMoveDown} disabled={selectedToMerge.length === 0} size='small'
                        className="buttonBase">
                        <ArrowDownwardIcon fontSize="small" />
                    </Button>
                </Box>
                <Box display="flex" justifyContent="space-between" p={2}>
                    <List
                        subheader={<ListSubheader>Available Networks</ListSubheader>}
                        component={Paper}
                        style={{ width: 350, maxHeight: 300, overflow: 'auto' }}
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
                        <Button variant="contained" onClick={handleAddNetwork} disabled={selectedAvailable.length === 0} >
                            <ArrowForwardIcon />
                        </Button>
                        <Button variant="contained" onClick={handleRemoveNetwork} disabled={selectedToMerge.length === 0} sx={{ mt: 1 }} >
                            <ArrowBackIcon />
                        </Button>
                    </Box>
                    <List
                        subheader={<ListSubheader>Networks to Merge</ListSubheader>}
                        component={Paper}
                        style={{ width: 350, maxHeight: 300, overflow: 'auto' }}
                    >
                        {toMergeNetworksList.map((network, index) => (
                            <ListItem
                                button
                                selected={selectedToMerge.includes(network)}
                                onClick={() => handleSelectToMerge(network[1])}
                                key={index}
                            >
                                <ListItemText primary={network[0]} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Advanced Options</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="h6" style={{ margin: '20px 0' }}>
                            Matching columns:
                        </Typography>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        {toMergeNetworksList.map(net => (
                                            <TableCell key={net[1]}>{net[0]}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        {toMergeNetworksList.map(net => (
                                            <TableCell key={net[1]}>
                                                <Select
                                                    value={matchingCols[net[1]]?.name || ''}
                                                    onChange={handleSetMatchingCols(net[1])}
                                                >
                                                    {networkRecords[net[1]]?.nodeTable.columns.map((column) => (
                                                        <MenuItem key={column.name} value={column.name}>
                                                            {column.name}
                                                        </MenuItem>
                                                    )) ?? ''}
                                                </Select>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Typography variant="h6" style={{ margin: '20px 0' }}>
                            How to merge columns:
                        </Typography>

                        <div className="card">
                            <PrimeReactProvider>
                                <DataTable value={nodeMatchingTable} tableStyle={{ minWidth: '50rem', maxHeight: '50rem' }}>
                                    {
                                        toMergeNetworksList.map(net => <PrimeColumn key={net[1]} field={net[1]} header={net[0] ?? 'Error'} body={networkColumnTemplate} />)
                                    }
                                    <PrimeColumn field="mergedNetwork" header="Merged Network" body={(rowData) => mergedNetworkTemplate(rowData)}></PrimeColumn>
                                    <PrimeColumn field="type" header="Column Type" body={(rowData) => rowData.type} />
                                </DataTable>
                            </PrimeReactProvider>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <Button onClick={() => setTableView(tableView === 'node' ? 'edge' : 'node')}>
                                Switch to {tableView === 'node' ? 'Edge' : 'Node'} Table
                            </Button>
                            <FormControlLabel
                                control={<Checkbox />}
                                label="Enable merging nodes/edges in the same network"
                            />
                            <FormControlLabel
                                control={<Checkbox />}
                                label="Merge only nodes and ignore edges"
                            />
                        </div>
                    </AccordionDetails>
                </Accordion>

            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleMerge} color="secondary">
                    Merge
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MergeDialog;
