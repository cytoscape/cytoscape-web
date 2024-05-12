//import the necessary libraries and components
import React from 'react';
import { NetworkRecord, Pair, TableView } from '../models/DataInterfaceForMerge';
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField } from '@mui/material';
import { MatchingTableRow } from '../models/DataInterfaceForMerge';
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
    setMatchingCols: (updateFunction: (prevCols: Record<IdType, Column>) => Record<IdType, Column>) => void;

}

export const MatchingTableComp = React.memo(({ networkRecords, netLst, data, type, setNodeMatchingTable, setEdgeMatchingTable, setMatchingCols }: MatchingTableProps) => {
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
        }
    };
    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
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
                    {data.map((row) => (
                        <TableRow key={row.id}>
                            {netLst.map((net) => (
                                <TableCell key={`${row.id}-${net[1]}`} component="th" scope="row">
                                    <NetAttDropDownTemplate
                                        networkRecords={networkRecords} rowData={row}
                                        column={net[1]} type={type}
                                        setNodeMatchingTable={setNodeMatchingTable}
                                        setEdgeMatchingTable={setEdgeMatchingTable}
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
                                />
                            </TableCell>
                            <TableCell key={`${row.id}-type`}>{row.type}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
});