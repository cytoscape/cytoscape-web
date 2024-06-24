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
import useMergeToolTipStore from '../store/mergeToolTip';

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
    const setMergeTooltipIsOpen = useMergeToolTipStore(state => state.setIsOpen)
    const setMergeTooltipText = useMergeToolTipStore(state => state.setText)
    const name2RowId = new Map<string, number[]>();
    const emptyRowIds = new Set<number>();
    tableData.forEach((row) => {
        const name = row.mergedNetwork;
        if (name.length > 0) {
            if (name2RowId.has(row.mergedNetwork)) {
                name2RowId.get(row.mergedNetwork)?.push(row.id);
            } else {
                name2RowId.set(row.mergedNetwork, [row.id]);
            }
        } else {
            emptyRowIds.add(row.id);
        }
    });
    //get rows that have duplicated name
    const duplicatedNamesIds = new Set((Array.from(name2RowId.values()).filter((ids) => ids.length > 1)).reduce((acc, val) => acc.concat(val), []));
    if (duplicatedNamesIds.size > 0) {
        setMergeTooltipIsOpen(true);
        setMergeTooltipText('Some rows have duplicated names. Please make sure each row has a unique name.');
    } else if (emptyRowIds.size > 0) {
        setMergeTooltipIsOpen(true);
        setMergeTooltipText('Merged network attribute name cannot be empty.');
    } else {
        setMergeTooltipIsOpen(false);
    }
    return (
        <TableContainer key={`${type}-tablecontainer`} component={Paper} sx={{ maxHeight: 500, overflow: 'auto' }}>
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
                        <Tooltip key={`${row.id}-row-tooltip`} title={row.hasConflicts ? 'This row has type conflict' :
                            (duplicatedNamesIds.has(row.id) ? 'This row has duplicated merged network attribute name' :
                                (emptyRowIds.has(row.id) ? 'This row\'s merged network attribute name is empty' : ''))} placement="top" arrow>
                            <TableRow key={`${row.id}-row`} style={{ backgroundColor: (row.hasConflicts || duplicatedNamesIds.has(row.id) || emptyRowIds.has(row.id)) ? '#e27070' : 'transparent' }}>
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
                                        <Tooltip key={`${row.id}-mergedNetwork-tooltip`} title={'This attribute is used to match nodes between networks.'} placement="top" arrow>
                                            <TextField
                                                key={`${row.id}-matchingAttribute-textField`}
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
                                </TableCell>
                            </TableRow>
                        </Tooltip>
                    ))}
                </TableBody>
            </Table>
        </TableContainer >
    )
});