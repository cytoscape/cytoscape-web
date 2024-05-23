import React from 'react';
import { MatchingTableRow } from '../models/MatchingTable';
import { NetworkRecord, TableView } from '../models/DataInterfaceForMerge';
import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { Column } from '../../../models/TableModel/Column';
import { IdType } from '../../../models/IdType';
import { ValueTypeName } from '../../../models/TableModel';

interface netAttDropDownTemplateProps {
    networkRecords: Record<IdType, NetworkRecord>
    rowData: { [x: string]: any; };
    column: string;
    type: TableView;
    netLst: [string, string][];
    setNodeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setEdgeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setNetMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setMatchingCols: (updateFunction: (prevCols: Record<string, Column>) => Record<string, Column>) => void;
}


// Editable cell template for the network attributes
export const NetAttDropDownTemplate = React.memo(({ networkRecords, rowData, column, type, netLst, setNodeMatchingTable, setEdgeMatchingTable, setNetMatchingTable, setMatchingCols }: netAttDropDownTemplateProps) => {
    const emptyOption = { label: 'None', value: 'None' };
    const tableType = type === TableView.node ? 'nodeTable' : (type === TableView.edge ? 'edgeTable' : 'netTable');
    const columns = networkRecords[column]?.[tableType]?.columns || [];
    const networkOptions = (type === TableView.node && rowData.id === 0) ? columns.map(nc => ({ label: nc.name, value: nc.name })) : [...columns.map(nc => ({ label: nc.name, value: nc.name })), emptyOption];
    const currentValue = (networkOptions.some(option => option.value === rowData[column]) && rowData[column] !== 'None') ? rowData[column] : '';

    // Handler for 'Dropdown' changes
    const onDropdownChange = (e: SelectChangeEvent<any>, type: TableView, rowData: { [x: string]: any; }, field: string) => {
        const updateTable = (prevTable: MatchingTableRow[], fieldType: string) => {
            const netIdLst = netLst.map(pair => pair[1]);
            const updatedTable = prevTable.map(row => {
                if (row.id === rowData.id) {
                    const netIdx: number = netIdLst.indexOf(field);
                    const originalCol = row[field];
                    const targetCol = e.target.value;
                    const originalType = columns.find(col => col.name === originalCol)?.type || 'None';
                    const targetType = columns.find(col => col.name === targetCol)?.type || 'None';

                    if (netIdLst.slice(0, netIdx).every((net: IdType) => row[net] === 'None')) {
                        let updatedNumConflicts = 0;
                        let matchingType: ValueTypeName | 'None' = 'None';
                        let startIdx = netIdx + 1;
                        for (const [idx, netId] of netIdLst.slice(netIdx).entries()) {
                            if ((idx === 0 && targetType !== 'None') || (idx > 0 && row[netId] !== 'None')) {
                                matchingType = idx === 0 ? targetType : (networkRecords[netId]?.[tableType]?.columns.find(col => col.name === row[netId])?.type || 'None');
                                startIdx = idx + netIdx + 1;
                                break;
                            }
                        }
                        netIdLst.slice(startIdx).forEach((netId: IdType) => {
                            if (row[netId] !== 'None') {
                                const matchingCol = networkRecords[netId]?.[tableType]?.columns.find(col => col.name === row[netId])?.type || 'None';
                                if (matchingCol !== matchingType) {
                                    updatedNumConflicts += 1;
                                }
                            }
                        })
                        return { ...row, [field]: targetCol, numConflicts: updatedNumConflicts, type: matchingType };
                    } else {
                        const updatedNumConflicts = ((originalType === row.type || originalType === 'None') ? 0 : -1) + ((targetType === 'None' || targetType === row.type) ? 0 : 1) + row.numConflicts;
                        return { ...row, [field]: targetCol, numConflicts: updatedNumConflicts };
                    }
                }
                return row;
            });
            return filterRows(updatedTable);
        };
        if (type === TableView.node) {
            setNodeMatchingTable(prevTable => updateTable(prevTable, 'nodeTable'));
            if (rowData.id === 0) {
                setMatchingCols(prevCols => {
                    const columnType = networkRecords[e.target.value]?.nodeTable?.columns.find(col => col.name === e.target.value)?.type || 'None';
                    return { ...prevCols, [field]: { name: e.target.value, type: columnType } as Column };
                });
            }
        } else if (type === TableView.edge) {
            setEdgeMatchingTable(prevTable => updateTable(prevTable, 'edgeTable'));
        } else if (type === TableView.network) {
            setNetMatchingTable(prevTable => updateTable(prevTable, 'netTable'));
        }
    };

    return (
        <FormControl id={`formcontrol-${rowData.id}-${column}`}>
            <Select
                labelId={`select-label-${rowData.id}-${column}`}
                value={currentValue}
                onChange={(e) => onDropdownChange(e, type, rowData, column)}
                id={`select-${rowData.id}-${column}`}
                style={{ minWidth: 100, maxWidth: 200 }}
            >
                {networkOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
});

const filterRows = (rows: MatchingTableRow[]) => {
    return rows.filter(row => {
        const allNone = Object.keys(row)
            .filter(key => key !== 'mergedNetwork' && key !== 'type' && key !== 'id' && key !== 'numConflicts')
            .every(key => row[key] === 'None');
        return !allNone;
    });
};
