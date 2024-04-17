import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Select,
    MenuItem, Typography, Box, List, ListItem, ListItemText, ListSubheader,
    Paper, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
    FormControl, InputLabel, FormControlLabel, Checkbox, TextField
} from '@mui/material';
import { Column } from '../../../models/TableModel';
import { IdType } from '../../../models/IdType';
import { useNdexNetwork } from '../../../store/hooks/useNdexNetwork';
import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../store/CredentialStore';
import { TableRecord, useTableStore } from '../../../store/TableStore';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column as PrimeColumn } from 'primereact/column';
import { PrimeReactProvider } from 'primereact/api';
import { Pair } from '../../../models/MergeModel/utils/dataInterface';
import { Network } from '../../../models/NetworkModel';
import { Table as NetworkTable } from '../../../models/TableModel';
import './MergeDialog.css';
import { set } from 'lodash';

enum MergeType {
    union = 'Union',
    intersection = 'Intersection',
    difference = 'Difference'
}

export interface NetworkRecord {
    network: Network;
    nodeTable: NetworkTable;
    edgeTable: NetworkTable;
}

interface MatchingTableRow {
    mergedNetwork: string;
    type: string;
    id: number;
}
interface MergeDialogProps {
    open: boolean;
    handleClose: () => void;
    workSpaceNetworks: Pair<string, IdType>[];
}

const MergeDialog: React.FC<MergeDialogProps> = ({ open, handleClose, workSpaceNetworks }): React.ReactElement => {
    const [tableView, setTableView] = useState('node');
    const { ndexBaseUrl } = useContext(AppConfigContext);
    const [mergeType, setMergeOption] = useState(MergeType.union);
    // Record the information of the networks to be merged
    const [networkRecords, setNetworkRecords] = useState<Record<IdType, NetworkRecord>>({});
    // Record the base network
    const [baseNetwork, setBaseNetwork] = useState<Pair<string, IdType>>(['', '']);
    // Record the matching columns for each network
    const [matchingMatchingCols, setMatchingMatchingCols] = useState<Record<IdType, string>>({});
    // Record the state of the matching table
    const [matchingTable, setMatchingTable] = useState<MatchingTableRow[]>([]);
    // Record the status of the available and selected networks lists
    const [availableNetworksList, setAvailableNetworksList] = useState<Pair<string, IdType>[]>(workSpaceNetworks);
    const [toMergeNetworksList, setToMergeNetworksList] = useState<Pair<string, IdType>[]>([]);
    const [selectedAvailable, setSelectedAvailable] = useState<Pair<string, IdType>[]>([]);
    const [selectedToMerge, setSelectedToMerge] = useState<Pair<string, IdType>[]>([]);
    const matchingTableRef = useRef<HTMLDivElement>(null);
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

    const handleAddNetwork = () => {
        setToMergeNetworksList([...toMergeNetworksList, ...selectedAvailable]);
        setAvailableNetworksList(availableNetworksList.filter(net => !selectedAvailable.includes(net)));
        setSelectedAvailable([]);
        toMergeNetworksList.forEach(async (net) => {
            if (!networkRecords.hasOwnProperty(net[1])) {
                await loadNetworkById(net[1]);
            }

        });
    };

    const handleRemoveNetwork = () => {
        setAvailableNetworksList([...availableNetworksList, ...selectedToMerge]);
        setToMergeNetworksList(toMergeNetworksList.filter(net => !selectedToMerge.includes(net)));
        setSelectedToMerge([]);
    };

    const handleBaseNetworkChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        let newAvailableNetworksList = [...availableNetworksList];
        if (baseNetwork !== undefined && workSpaceNetworks.some(net => (net[0] === baseNetwork[0] && net[1] === baseNetwork[1]))) {
            if (!availableNetworksList.some(net => (net[0] === baseNetwork[0] && net[1] === baseNetwork[1]))) {
                newAvailableNetworksList = [...newAvailableNetworksList, baseNetwork];
            } else {
                console.log('Data Conflict: Duplicate Network Found!')
            }
        }
        const newBaseNetworkId = event.target.value as IdType;
        const newBaseNetworkName = workSpaceNetworks.find(net => net[1] === newBaseNetworkId)?.[0] ?? 'Error';
        newAvailableNetworksList = newAvailableNetworksList.filter(net => net[1] !== newBaseNetworkId);
        setBaseNetwork([newBaseNetworkName, newBaseNetworkId]);
        setAvailableNetworksList(newAvailableNetworksList);
        setToMergeNetworksList(toMergeNetworksList.filter(net => net[1] !== newBaseNetworkId));
        setSelectedAvailable(selectedAvailable.filter(net => net[1] !== newBaseNetworkId));
        setSelectedToMerge(selectedToMerge.filter(net => net[1] !== newBaseNetworkId));
        if (!networkRecords.hasOwnProperty(newBaseNetworkId)) {
            await loadNetworkById(newBaseNetworkId);
        }
    }

    const getToken: () => Promise<string> = useCredentialStore(
        (state) => state.getToken,
    )

    // Handler for the 'Matching Columns' dropdown changes
    const handleSetMatchingCols = (networkId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setMatchingMatchingCols({
            ...matchingMatchingCols,
            [networkId]: event.target.value as string
        });
    };

    // Update the matching table when selectedNetworks changes
    // useEffect(() => {
    //     const sharedColsRecord: Record<IdType, string[]> = {};
    //     // Create the initial matching table with the columns of the base network
    //     if (baseNetwork !== undefined) {
    //         const newMatchingTable = networkRecords[baseNetwork[1]]?.nodeTable?.columns.map((col, index) => {
    //             const matchCols: Record<string, string> = {};
    //             toMergeNetworksList.forEach(net => {
    //                 const network = networkRecords[net[1]];
    //                 if (network.nodeTable?.columns.some(nc => nc.name === col.name)) {
    //                     const newSharedCols = sharedColsRecord[net[1]] ? [...sharedColsRecord[net[1]]] : [];
    //                     newSharedCols.push(col.name);
    //                     sharedColsRecord[net[1]] = newSharedCols;
    //                     matchCols[net[1]] = col.name;
    //                 } else {
    //                     matchCols[net[1]] = 'None';
    //                 }
    //             });
    //             return {
    //                 id: index,
    //                 [baseNetwork[1]]: col.name,
    //                 ...matchCols,
    //                 mergedNetwork: col.name,
    //                 type: col.type,
    //             };
    //         });

    //         // Loop over networks and update the matching table for each network
    //         toMergeNetworksList.forEach((net1, index1) => {
    //             networkRecords[net1[1]]?.nodeTable?.columns.forEach(col => {
    //                 if (!sharedColsRecord[net1[1]]?.includes(col.name)) {
    //                     const matchCols: Record<string, string> = {};
    //                     matchCols[net1[1]] = col.name;

    //                     toMergeNetworksList.slice(0, index1)?.forEach(net2 => {
    //                         matchCols[net2[1]] = 'None';
    //                     });
    //                     toMergeNetworksList.slice(index1 + 1).forEach(net2 => {
    //                         const network = networkRecords[net1[1]];
    //                         if (network?.nodeTable?.columns.some(nc => nc.name === col.name)) {
    //                             const newSharedCols = sharedColsRecord[net2[1]] ? [...sharedColsRecord[net2[1]]] : [];
    //                             newSharedCols.push(col.name);
    //                             sharedColsRecord[net2[1]] = newSharedCols;
    //                             matchCols[net2[1]] = col.name;
    //                         } else {
    //                             matchCols[net2[1]] = 'None';
    //                         }
    //                     });

    //                     newMatchingTable.push({
    //                         id: newMatchingTable.length,
    //                         [baseNetwork[1]]: 'None',
    //                         ...matchCols,
    //                         mergedNetwork: col.name,
    //                         type: col.type,
    //                     });
    //                 }
    //             });
    //         });
    //         setMatchingTable(newMatchingTable);
    //     }
    // }, [toMergeNetworksList, baseNetwork]);

    const handleMergeTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMergeOption(event.target.value as MergeType);
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
        setMatchingTable(prevTable => prevTable.map(row =>
            row.id === rowData.id ? { ...row, [field]: e.target.value } : row
        ));
    };

    // Handler for 'Merged Network' changes
    const onMergedNetworkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, rowData: { [x: string]: any; }) => {
        setMatchingTable(prevTable => prevTable.map(row =>
            row.id === rowData.id ? { ...row, mergedNetwork: e.target.value } : row
        ));
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
                <FormControl fullWidth margin="normal">
                    <InputLabel id="merge-type-label">Type of Merge</InputLabel>
                    <Select
                        labelId="merge-type-label"
                        id="merge-type"
                        value={mergeType}
                        onChange={handleMergeTypeChange}
                        label="Type of Merge"
                    >
                        <MenuItem value={MergeType.union}>Union</MenuItem>
                        <MenuItem value={MergeType.intersection}>Intersection</MenuItem>
                        <MenuItem value={MergeType.difference}>Difference</MenuItem>
                    </Select>
                </FormControl>
                <Typography variant="h6" style={{ margin: '20px 0' }}>
                    Select Networks to Merge:
                </Typography>
                <FormControl fullWidth margin="normal">
                    <InputLabel id="select-base-network-label">Select Base Network</InputLabel>
                    <Select
                        labelId="base-network-label"
                        id="base-network"
                        value={baseNetwork[1]}
                        onChange={handleBaseNetworkChange}
                        label="Select Base Network"
                    >
                        {workSpaceNetworks.map((net) => {
                            return <MenuItem value={net[1]}>{net[0]}</MenuItem>
                        })}

                    </Select>
                </FormControl>
                <Box display="flex" justifyContent="center" p={2}>
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
                        <Button
                            variant="contained"
                            onClick={handleAddNetwork}
                            disabled={selectedAvailable.length === 0}
                        >
                            {'>'}
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleRemoveNetwork}
                            disabled={selectedToMerge.length === 0}
                            sx={{ mt: 1 }}
                        >
                            {'<'}
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

                <Typography variant="h6" style={{ margin: '20px 0' }}>
                    Matching columns:
                </Typography>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{baseNetwork[0] || 'Base Network'}</TableCell>
                                {toMergeNetworksList.map(net => (
                                    <TableCell key={net[1]}>{net[0]}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell key={baseNetwork[1]}>
                                    <Select
                                        value={matchingMatchingCols[baseNetwork[1]] || ''}
                                        onChange={handleSetMatchingCols(baseNetwork[1])}
                                    >
                                        {networkRecords[baseNetwork[1]]?.nodeTable.columns.map((column) => (
                                            <MenuItem key={column.name} value={column.name}>
                                                {column.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </TableCell>
                                {toMergeNetworksList.map(net => (
                                    <TableCell key={net[1]}>
                                        <Select
                                            value={matchingMatchingCols[net[1]] || ''}
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
                        <DataTable value={matchingTable} tableStyle={{ minWidth: '50rem' }}>
                            <PrimeColumn key={baseNetwork ? baseNetwork[1] : ''} field={baseNetwork ? baseNetwork[1] : ''}
                                header={baseNetwork ? baseNetwork[0] : ''} body={networkColumnTemplate} />
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
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleClose} color="secondary">
                    Merge
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MergeDialog;
