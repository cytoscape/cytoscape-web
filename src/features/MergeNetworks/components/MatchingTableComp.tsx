//import the necessary libraries and components
import React, { useEffect } from 'react';
import { PriorityHigh as PriorityHighIcon } from '@mui/icons-material';
import { MergeType, NetworkRecord, Pair, TableView } from '../models/DataInterfaceForMerge';
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
import { ValueTypeName } from '../../../models/TableModel';

interface MatchingTableProps {
    networkRecords: Record<IdType, NetworkRecord>
    netLst: Pair<string, string>[];
    tableView: TableView;
    mergeOpType: MergeType;
}

export const MatchingTableComp = React.memo(({ networkRecords, netLst, tableView, mergeOpType }: MatchingTableProps) => {
    const tableData = (tableView === TableView.node) ? useNodeMatchingTableStore(state => state.rows) :
        (tableView === TableView.edge ? useEdgeMatchingTableStore(state => state.rows) : useNetMatchingTableStore(state => state.rows))
    const setMatchingTable = (tableView === TableView.node) ? useNodeMatchingTableStore(state => state.setRow) :
        (tableView === TableView.edge ? useEdgeMatchingTableStore(state => state.setRow) : useNetMatchingTableStore(state => state.setRow));
    // Handler for 'Merged Network' changes
    const onMergedNetworkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, rowIndex: number, rowData: MatchingTableRow) => {
        const updatedRow = { ...rowData, mergedNetwork: e.target.value };
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

    useEffect(() => {
        if (netLst.length > 0) {
            let isReady = true
            if (duplicatedNamesIds.size > 0) {
                isReady = false
                setMergeTooltipText("Merge is disabled because there are duplicated network attribute names. Please ensure each attribute name is unique.");
            } else if (emptyRowIds.size > 0) {
                isReady = false
                setMergeTooltipText("Merge is disabled because some network attribute names are empty. Please provide a name for each attribute.");
            }
            if (mergeOpType === MergeType.intersection && netLst.length < 2) {
                isReady = false
                setMergeTooltipText("Merge is disabled because intersection merge operation must take two or more networks. Please select at least two networks in the \'Networks to Merge\' list.")
            } else if (mergeOpType === MergeType.difference && netLst.length !== 2) {
                isReady = false
                setMergeTooltipText("Merge is disabled because difference merge operation must take exactly two networks. Plesae select exactly two networks in the \'Networks to Merge\' list.")
            }
            if (tableView === TableView.node && tableData.length < 1) {
                isReady = false
                setMergeTooltipText("Merge is disabled because the node column table must contain at least one row.")
            } else if (tableView === TableView.network && tableData.length < 3) {
                isReady = false
                setMergeTooltipText("Merge is disabled because the network column table must contain at least three rows.")
            }
            setMergeTooltipIsOpen(!isReady);
        } else {
            setMergeTooltipIsOpen(true);
            setMergeTooltipText("Please select networks to merge")
        }
    }, [duplicatedNamesIds, emptyRowIds, netLst, mergeOpType]);

    const getTooltipMessage = (row: MatchingTableRow, duplicatedNamesIds: Set<number>, emptyRowIds: Set<number>, netLst: Pair<string, string>[]) => {
        if (row.hasConflicts) {
            const conflictDescription: string[] = [];
            const typeSet = new Set<ValueTypeName | 'None'>();
            for (const [_, netId] of netLst) {
                if (row.nameRecord[netId] !== 'None' && row.typeRecord[netId] !== undefined && !typeSet.has(row.typeRecord[netId])) {
                    conflictDescription.push(`${row.nameRecord[netId]}(${row.typeRecord[netId]})`);
                    typeSet.add(row.typeRecord[netId]);
                }
            }
            const conflictStr: string[] = conflictDescription.length > 2 ? ['type conflicts', 'conflicts'] : ['a type conflict', 'conflict'];
            return `This row has ${conflictStr[0]}: ${conflictDescription.join(', ')} . Please resolve the ${conflictStr[1]}.`;
        }
        if (duplicatedNamesIds.has(row.id)) return "This row has a duplicated merged network attribute name. Please ensure each attribute name is unique.";
        if (emptyRowIds.has(row.id)) return "This row has an empty merged network attribute name. Please provide a name for each attribute.";
        return '';
    };

    return (
        <TableContainer key={`${tableView}-tablecontainer`} component={Paper} sx={{ maxHeight: 500, overflow: 'auto' }}>
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
                        <Tooltip key={`${row.id}-row-tooltip`} title={getTooltipMessage(row, duplicatedNamesIds, emptyRowIds, netLst)} placement="top" arrow>
                            <TableRow key={`${row.id}-row`} style={{ backgroundColor: (row.hasConflicts || duplicatedNamesIds.has(row.id) || emptyRowIds.has(row.id)) ? '#e98e8e' : 'transparent' }}>
                                {netLst.map((net) => (
                                    <TableCell key={`${row.id}-${net[1]}`} component="th" scope="row">
                                        <NetAttDropDownTemplate
                                            networkRecords={networkRecords} rowData={row} rowIndex={rowIndex}
                                            column={net[1]} type={tableView} netLst={netLst}
                                        />
                                    </TableCell>
                                ))}
                                <TableCell key={`${row.id}-mergedNetwork`}>
                                    {(row.id === 0 && tableView === TableView.node) ?
                                        <Tooltip key={`${row.id}-mergedNetwork-tooltip`} title={'This attribute is used to match nodes between networks.'} placement="top" arrow>
                                            <TextField
                                                key={`${row.id}-matchingAttribute-textField`}
                                                fullWidth
                                                variant="outlined"
                                                value={row.mergedNetwork}
                                                onChange={(e) => onMergedNetworkChange(e, rowIndex, row)}
                                                style={{ minWidth: 100 }}
                                                InputProps={{ style: { color: 'red' } }}
                                            />
                                        </Tooltip> :
                                        <TextField
                                            key={`${row.id}-textField`}
                                            fullWidth
                                            variant="outlined"
                                            value={row.mergedNetwork}
                                            onChange={(e) => onMergedNetworkChange(e, rowIndex, row)}
                                            style={{ minWidth: 100 }}
                                            disabled={tableView === TableView.network && rowIndex < 3}
                                        />}
                                </TableCell>
                                <TableCell key={`${row.id}-type`}>
                                    <TypeDropDownTemplate type={tableView} rowData={row} rowIndex={rowIndex} netLst={netLst} />
                                </TableCell>
                            </TableRow>
                        </Tooltip>
                    ))}
                </TableBody>
            </Table>
        </TableContainer >
    )
});