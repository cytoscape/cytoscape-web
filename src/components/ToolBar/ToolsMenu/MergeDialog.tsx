import React, { useContext, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { MergeType } from '../../../models/MergeModel/impl/MergeType';
import { Column } from '../../../models/TableModel';
import { IdType } from '../../../models/IdType';
import { Box, Chip, List, ListItem, ListItemText, ListSubheader, OutlinedInput, Typography } from '@mui/material';
import { useNdexNetwork } from '../../../store/hooks/useNdexNetwork';
import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../store/CredentialStore';
import { useNetworkStore } from '../../../store/NetworkStore';
import { TableRecord, useTableStore } from '../../../store/TableStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { useViewModelStore } from '../../../store/ViewModelStore';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Column as PrimeColumn } from 'primereact/column';

export interface NetworkToMerge {
    name: string;
    nodeColumns: Column[];
    edgeColumns: Column[];
}

interface MergeDialogProps {
    open: boolean;
    handleClose: () => void;
    currentNetwork: NetworkToMerge & { ownerUUID: IdType };
    availableNetworks: Record<IdType, NetworkToMerge>;
}

type Pair<T1, T2> = [T1, T2];

const MergeDialog: React.FC<MergeDialogProps> = ({ open, handleClose, currentNetwork, availableNetworks }): React.ReactElement => {

    const [view, setView] = useState('node');
    const { ndexBaseUrl } = useContext(AppConfigContext);
    const [mergeType, setMergeOption] = useState(MergeType.union);
    const [matchingCurCol, setMatchingCurCol] = useState('');
    const [matchingColsToMerge, setMatchingColsToMerge] = useState<Record<IdType, string>>({});
    const [matchingTable, setMatchingTable] = useState(() =>
        currentNetwork.nodeColumns.map((col, index) => ({
            id: index,
            [currentNetwork.ownerUUID]: col.name,
            mergedNetwork: col.name,
            type: col.type,
        }))
    ); // record the state of the matching table
    const [availableNetworksList, setAvailableNetworksList] = useState<Pair<string, string>[]>(
        Object.keys(availableNetworks).map((externalId) =>
            [availableNetworks[externalId].name, externalId]));
    const [selectedNetworks, setSelectedNetworks] = useState<Pair<string, string>[]>([]);
    const [selectedAvailable, setSelectedAvailable] = useState<Pair<string, string>[]>([]);
    const [selectedToMerge, setSelectedToMerge] = useState<Pair<string, string>[]>([]);

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
            const pairToAdd = selectedNetworks.find(pair => pair[1] === uuid);
            if (pairToAdd) newSelectedToMerge.push(pairToAdd);
        } else {
            newSelectedToMerge.splice(currentIndex, 1);
        }

        setSelectedToMerge(newSelectedToMerge);
    };

    const handleAddNetwork = () => {
        setSelectedNetworks([...selectedNetworks, ...selectedAvailable]);
        setAvailableNetworksList(availableNetworksList.filter(net => !selectedAvailable.includes(net)));
        setSelectedAvailable([]);
        selectedAvailable.map(async net => {
            if (!networkTables.hasOwnProperty(net[1])) {
                await loadNetworkById(net[1]);
            }
        })
    };

    const handleRemoveNetwork = () => {
        setAvailableNetworksList([...availableNetworksList, ...selectedToMerge]);
        setSelectedNetworks(selectedNetworks.filter(net => !selectedToMerge.includes(net)));
        setSelectedToMerge([]);
    };

    const getToken: () => Promise<string> = useCredentialStore(
        (state) => state.getToken,
    )
    const addNewNetwork = useNetworkStore((state) => state.add)
    const addTable = useTableStore((state) => state.add)
    const addVisualStyle = useVisualStyleStore((state) => state.add)
    const addViewModel = useViewModelStore((state) => state.add)
    const networkTables: Record<IdType, TableRecord> = useTableStore((state) => state.tables);

    const handleSetCurCol = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMatchingCurCol(event.target.value as string);
    };
    const handleSetColsToMerge = (networkId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setMatchingColsToMerge({
            ...matchingColsToMerge,
            [networkId]: event.target.value as string
        });
    };

    // update the matching table when selectedNetworks changes
    useEffect(() => {
        const sharedColsRecord: Record<IdType, string[]> = {};
        const newMatchingTable = currentNetwork.nodeColumns.map((col, index) => {
            const matchCols: Record<string, string> = {};
            selectedNetworks.forEach(net => {
                const network = availableNetworks[net[1]];
                if (network?.nodeColumns.some(nc => nc.name === col.name)) {
                    const newSharedCols = sharedColsRecord[net[1]] ? [...sharedColsRecord[net[1]]] : [];
                    newSharedCols.push(col.name);
                    sharedColsRecord[net[1]] = newSharedCols;
                    matchCols[net[1]] = col.name;
                } else {
                    matchCols[net[1]] = '';
                }
            });
            return {
                id: index,
                [currentNetwork.ownerUUID]: col.name,
                ...matchCols,
                mergedNetwork: col.name,
                type: col.type,
            };
        });

        // Loop over networks and update the matching table for each network
        selectedNetworks.forEach((net1, index1) => {
            availableNetworks[net1[1]]?.nodeColumns.forEach(col => {
                if (!sharedColsRecord[net1[1]]?.includes(col.name)) {
                    const matchCols: Record<string, string> = {};
                    matchCols[net1[1]] = col.name;

                    selectedNetworks.slice(0, index1).forEach(net2 => {
                        matchCols[net2[1]] = '';
                    });
                    selectedNetworks.slice(index1 + 1).forEach(net2 => {
                        const network = availableNetworks[net2[1]];
                        if (network?.nodeColumns.some(nc => nc.name === col.name)) {
                            const newSharedCols = sharedColsRecord[net2[1]] ? [...sharedColsRecord[net2[1]]] : [];
                            newSharedCols.push(col.name);
                            sharedColsRecord[net2[1]] = newSharedCols;
                            matchCols[net2[1]] = col.name;
                        } else {
                            matchCols[net2[1]] = '';
                        }
                    });

                    newMatchingTable.push({
                        id: newMatchingTable.length,
                        [currentNetwork.ownerUUID]: '',
                        ...matchCols,
                        mergedNetwork: col.name,
                        type: col.type,
                    });
                }
            });
        });

        setMatchingTable(newMatchingTable);
    }, [selectedNetworks, currentNetwork, availableNetworks]);

    const handleSetMachingTable = () => {

    }


    const handleMergeTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMergeOption(event.target.value as string);
    };

    //utility function to load network by id
    const loadNetworkById = async (networkId: IdType): Promise<void> => {
        const currentToken = await getToken();
        const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken);
        const { network, nodeTable, edgeTable, visualStyle, networkViews } = res;
        addNewNetwork(network);
        addVisualStyle(networkId, visualStyle);
        addTable(networkId, nodeTable, edgeTable);
        addViewModel(networkId, networkViews[0])
        return
    }

    //utility function to find index of a pair in a list
    const findPairIndex = (pairs: Pair<string, string>[], uuid: string) => {
        return pairs.findIndex(pair => pair[1] === uuid);
    };

    // Define a dropdown template for network columns
    const networkColumnTemplate = (rowData: { [x: string]: any; }, column: { field: string | number; }) => {
        const networkOptions = availableNetworks[column.field]?.nodeColumns.map(nc => ({ label: nc.name, value: nc.name })) || [];
        return (
            <Dropdown
                value={rowData[column.field]}
                options={networkOptions}
                onChange={(e) => onDropdownChange(e, rowData, column.field)}
                placeholder={rowData[column.field]}
            />
        );
    };

    // Define an editable cell template for the 'Merged Network' column
    const mergedNetworkTemplate = (rowData: { [x: string]: any; }) => {
        const [isFocused, setIsFocused] = useState(false);
        return (
            <InputText
                type="text"
                value={rowData.mergedNetwork}
                style={{
                    border: isFocused ? '2px solid #007ad9' : '0 solid transparent',
                    outline: 'none'
                }}
                onChange={(e) => onMergedNetworkChange(e, rowData)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
        );
    };

    // Handler for dropdown changes
    const onDropdownChange = (e: DropdownChangeEvent, rowData: { [x: string]: any; }, field: string | number) => {
        setMatchingTable(prevTable => prevTable.map(row =>
            row.id === rowData.id ? { ...row, [e.target.name]: e.value } : row
        ));
    };

    // Handler for 'Merged Network' changes
    const onMergedNetworkChange = (e: React.ChangeEvent<HTMLInputElement>, rowData: { [x: string]: any; }) => {
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
                // Select networks to merge
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
                        {selectedNetworks.map((network, index) => (
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
                                <TableCell>{currentNetwork.name}</TableCell>
                                {selectedNetworks.map(net => (
                                    <TableCell key={net[1]}>{availableNetworks[net[1]]?.name ?? 'Error'}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell key={currentNetwork.ownerUUID}>
                                    <Select
                                        value={matchingCurCol}
                                        onChange={handleSetCurCol}
                                    >
                                        {currentNetwork.nodeColumns.map((column) => (
                                            <MenuItem key={column.name} value={column.name}>
                                                {column.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </TableCell>
                                {selectedNetworks.map(net => (
                                    <TableCell key={net[1]}>
                                        <Select
                                            value={matchingColsToMerge[net[1]] || ''}
                                            onChange={handleSetColsToMerge(net[1])}
                                        >
                                            {availableNetworks[net[1]]?.nodeColumns.map((column) => (
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

                {/* <div className="card">
                    <DataTable value={matchingTable} tableStyle={{ minWidth: '50rem' }}>
                        <PrimeColumn field={currentNetwork.ownerUUID} header={currentNetwork.name}></PrimeColumn>
                        {
                            selectedNetworks.length <= 0
                                ? <PrimeColumn header='Network to Merge' />
                                : selectedNetworks.map(net => {
                                    const network = availableNetworks[net[1]];
                                    return (
                                        <PrimeColumn key={net[1]} field={net[1]} header={network?.name ?? 'Error'} />
                                    )
                                })
                        }
                        <PrimeColumn field="mergedNetwork" header="Merged Network"></PrimeColumn>
                        <PrimeColumn field="type" header="Column Type"></PrimeColumn>

                    </DataTable>
                </div> */}
                <div className="card">
                    <DataTable value={matchingTable} tableStyle={{ minWidth: '50rem' }}>
                        <PrimeColumn field={currentNetwork.ownerUUID} header={currentNetwork.name} body={networkColumnTemplate}></PrimeColumn>
                        {
                            selectedNetworks.map(net => {
                                const network = availableNetworks[net[1]];
                                return (
                                    <PrimeColumn key={net[1]} field={net[1]} header={network?.name ?? 'Error'} body={networkColumnTemplate} />
                                );
                            })
                        }
                        <PrimeColumn field="mergedNetwork" header="Merged Network" body={(rowData) => mergedNetworkTemplate(rowData)}></PrimeColumn>
                        <PrimeColumn field="type" header="Column Type" body={(rowData) => rowData.type} />
                    </DataTable>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Button onClick={() => setView(view === 'node' ? 'edge' : 'node')}>
                        Switch to {view === 'node' ? 'Edge' : 'Node'} Table
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
