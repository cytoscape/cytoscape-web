//import the necessary libraries and components
import React from 'react';
import { PriorityHigh as PriorityHighIcon } from '@mui/icons-material';
import { NetworkRecord, Pair, TableView } from '../models/DataInterfaceForMerge';
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Tooltip } from '@mui/material';
import { MatchingTableRow } from '../models/MatchingTable';
import { NetAttDropDownTemplate } from './NetAttDropDownTemplate';
import { TypeDropDownTemplate } from './TypeDropDownTemplate';
import { IdType } from '../../../models/IdType';
import { Column } from '../../../models/TableModel/Column';
import useNodeMatchingTableStore from '../store/nodeMatchingTableStore';
import useEdgeMatchingTableStore from '../store/edgeMatchingTableStore';
import useNetMatchingTableStore from '../store/netMatchingTableStore';

interface MatchingTableProps {
    networkRecords: Record<IdType, NetworkRecord>
    netLst: Pair<string, string>[];
    type: TableView;
    matchingCols?: Record<IdType, Column>;
}

export const MatchingTableComp = React.memo(({ networkRecords, netLst, type }: MatchingTableProps) => {
    const tableData = (type === TableView.node) ? useNodeMatchingTableStore(state => state.rows) :
        (type === TableView.edge ? useEdgeMatchingTableStore(state => state.rows) : useNetMatchingTableStore(state => state.rows))
    const setMatchingTable = (type === TableView.node) ? useNodeMatchingTableStore(state => state.setRow) :
        (type === TableView.edge ? useEdgeMatchingTableStore(state => state.setRow) : useNetMatchingTableStore(state => state.setRow));
    // Handler for 'Merged Network' changes
    const onMergedNetworkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, rowIndex: number) => {
        const updatedRow = { ...tableData[rowIndex], mergedNetwork: e.target.value };
        setMatchingTable(rowIndex, updatedRow);
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
                    {tableData.map((row, rowIndex) => (
                        <TableRow key={row.id}>
                            {netLst.map((net) => (
                                <TableCell key={`${row.id}-${net[1]}`} component="th" scope="row">
                                    <NetAttDropDownTemplate
                                        networkRecords={networkRecords} rowData={row}
                                        column={net[1]} type={type} netLst={netLst}
                                    />
                                </TableCell>
                            ))}
                            <TableCell key={`${row.id}-mergedNetwork`}>
                                {(row.id === 0 && type === TableView.node) ?
                                    <Tooltip title={'This attribute is used to match nodes between networks.'} placement="top" arrow>
                                        <TextField
                                            key={`${row.id}-textField`}
                                            fullWidth
                                            variant="outlined"
                                            value={row.mergedNetwork}
                                            onChange={(e) => onMergedNetworkChange(e, row.id)}
                                            style={{ minWidth: 100 }}
                                            InputProps={{ style: { color: 'red' } }}
                                        />
                                    </Tooltip> :
                                    <TextField
                                        key={`${row.id}-textField`}
                                        fullWidth
                                        variant="outlined"
                                        value={row.mergedNetwork}
                                        onChange={(e) => onMergedNetworkChange(e, row.id)}
                                        style={{ minWidth: 100 }}
                                        disabled={type === TableView.network && rowIndex < 3}
                                    />}
                            </TableCell>
                            <TableCell key={`${row.id}-type`}>
                                <TypeDropDownTemplate type={type} rowData={row} netLst={netLst} />
                                {row.hasConflicts ?
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