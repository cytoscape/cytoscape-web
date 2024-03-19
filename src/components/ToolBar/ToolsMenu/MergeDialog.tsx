import React, { useContext, useState } from 'react';
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
import { Chip, OutlinedInput, Typography } from '@mui/material';
import { useNdexNetwork } from '../../../store/hooks/useNdexNetwork';
import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../store/CredentialStore';
import { useNetworkStore } from '../../../store/NetworkStore';
import { TableRecord, useTableStore } from '../../../store/TableStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { useViewModelStore } from '../../../store/ViewModelStore';

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


const MergeDialog: React.FC<MergeDialogProps> = ({ open, handleClose, currentNetwork, availableNetworks }): React.ReactElement => {
    // State 
    const [view, setView] = useState('node');
    const { ndexBaseUrl } = useContext(AppConfigContext)
    const [networksTBMerged, setNetworksTBMerged] = useState<IdType[]>([]);;
    const [mergeType, setMergeOption] = useState(MergeType.union);
    const [matchingCurCol, setMatchingCurCol] = useState('');
    const [matchingColsTBMerged, setMatchingColsTBMerged] = useState<Record<IdType, string>>({});


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
    const handleSetColsTBMerged = (networkId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setMatchingColsTBMerged({
            ...matchingColsTBMerged,
            [networkId]: event.target.value as string
        });
    };
    // Handle dropdown change
    const handleNetworksTBMerged = async (event: SelectChangeEvent<IdType[]>): Promise<void> => {
        let { target: { value } } = event;
        let selectedValues: string[] = [];
        if (typeof value === 'string') {
            selectedValues = value.split(',');
        } else {
            selectedValues = value;
        }

        // Update the state 
        setNetworksTBMerged(selectedValues);
        const newMatchingColsTBMerged = Object.keys(matchingColsTBMerged)
            .filter(key => selectedValues.includes(key))
            .reduce<Record<IdType, string>>((newObj, key) => {
                newObj[key] = matchingColsTBMerged[key];
                return newObj;
            }, {});
        setMatchingColsTBMerged(newMatchingColsTBMerged);

        // Check and load networks if necessary
        for (const v of selectedValues) {
            if (!networkTables.hasOwnProperty(v)) {
                await loadNetworkById(v);
            }
        }
        return
    };

    const handleMergeTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMergeOption(event.target.value as string);
    };

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
                    <InputLabel id="networks-to-merge-label">Choose the Networks to be Merged</InputLabel>
                    <Select
                        labelId="networks-to-merge-label"
                        id="networks-to-merge-select"
                        multiple
                        value={networksTBMerged}
                        onChange={handleNetworksTBMerged}
                        input={<OutlinedInput id="select-multiple-chip" label="Choose the Networks to be Merged" />}
                        renderValue={(selected) => (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {selected.map((id) => (
                                    <Chip
                                        key={id}
                                        label={availableNetworks[id].name}
                                        onClick={(event) => event.stopPropagation()}
                                    />
                                ))}
                            </div>
                        )}
                    >
                        {Object.keys(availableNetworks).map((externalId) => (
                            <MenuItem key={externalId} value={externalId}>
                                {availableNetworks[externalId].name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

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
                    Matching columns:
                </Typography>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{currentNetwork.name}</TableCell>
                                {networksTBMerged.map(networkId => (
                                    <TableCell key={networkId}>{availableNetworks[networkId]?.name ?? 'Error'}</TableCell>
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
                                {networksTBMerged.map(networkId => (
                                    <TableCell key={networkId}>
                                        <Select
                                            value={matchingColsTBMerged[networkId] || ''}
                                            onChange={handleSetColsTBMerged(networkId)}
                                        >
                                            {availableNetworks[networkId]?.nodeColumns.map((column) => (
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
