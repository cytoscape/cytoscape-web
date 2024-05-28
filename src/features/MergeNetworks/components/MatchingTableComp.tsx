//import the necessary libraries and components
import React from 'react';
import { PriorityHigh as PriorityHighIcon } from '@mui/icons-material';
import { NetworkRecord, Pair, TableView } from '../models/DataInterfaceForMerge';
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Tooltip } from '@mui/material';
import { MatchingTableRow } from '../models/MatchingTable';
import { NetAttDropDownTemplate } from './NetAttDropDownTemplate';
import { IdType } from '../../../models/IdType';
import { Column } from '../../../models/TableModel/Column';

interface MatchingTableProps {
    networkRecords: Record<IdType, NetworkRecord>
    netLst: Pair<string, string>[];
    data: MatchingTableRow[];
    type: TableView;
    setNodeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setEdgeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setNetMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setMatchingCols: (updateFunction: (prevCols: Record<IdType, Column>) => Record<IdType, Column>) => void;
    matchingCols?: Record<IdType, Column>;
}

export const MatchingTableComp = React.memo(({ networkRecords, netLst, data, type, setNodeMatchingTable, setEdgeMatchingTable, setNetMatchingTable, setMatchingCols }: MatchingTableProps) => {
    // Handler for 'Merged Network' changes
    const onMergedNetworkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, type: TableView, rowIndex: number) => {
        const updatedValue = e.target.value;
        const updateTable = (prevTable: MatchingTableRow[]) => {
            if (rowIndex < 0 || rowIndex > prevTable.length) return prevTable;
            const newRow = { ...prevTable[rowIndex], mergedNetwork: updatedValue };
            const newTable = [...prevTable];
            newTable[rowIndex] = newRow;
            return newTable;
        };

        if (type === TableView.node) {
            setNodeMatchingTable(updateTable);
        } else if (type === TableView.edge) {
            setEdgeMatchingTable(updateTable);
        } else if (type === TableView.network) {
            setNetMatchingTable(updateTable);
        }
    };
    return (
        <TableContainer component={Paper} sx={{ maxHeight: 500, overflow: 'auto' }}>
            <Table sx={{ minWidth: 400 }} aria-label="simple table">
                <TableHead>
                    <TableRow>
                        {netLst.map((net) => (
                            <TableCell key={net[1]}>{net[0]}</TableCell>
                        ))}
                        <TableCell>Merged Network</TableCell>
                        <TableCell>Type</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row, rowIndex) => (
                        <TableRow key={row.id}>
                            {netLst.map((net) => (
                                <TableCell key={`${row.id}-${net[1]}`} component="th" scope="row">
                                    <NetAttDropDownTemplate
                                        networkRecords={networkRecords} rowData={row}
                                        column={net[1]} type={type} netLst={netLst}
                                        setNodeMatchingTable={setNodeMatchingTable}
                                        setEdgeMatchingTable={setEdgeMatchingTable}
                                        setNetMatchingTable={setNetMatchingTable}
                                        setMatchingCols={setMatchingCols}
                                    />
                                </TableCell>
                            ))}
                            <TableCell key={`${row.id}-mergedNetwork`}>
                                <TextField
                                    key={`${row.id}-textField`}
                                    fullWidth
                                    variant="outlined"
                                    value={row.mergedNetwork}
                                    onChange={(e) => onMergedNetworkChange(e, type, row.id)}
                                    style={{ minWidth: 100 }}
                                    disabled={type === TableView.network && rowIndex < 3}
                                />
                            </TableCell>
                            <TableCell key={`${row.id}-type`}>
                                {row.type}
                                {row.numConflicts > 0 ?
                                    <Tooltip title={'Type coercion may be applied to this attribute.'} placement="top" arrow>
                                        <PriorityHighIcon viewBox="0 -3.7 24 24" style={{ color: 'red' }} />
                                    </Tooltip > : ''}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer >
    )
});