import React from 'react';
import { MatchingTableRow } from '../models/MatchingTable';
import { NetworkRecord, TableView } from '../models/DataInterfaceForMerge';
import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { Column } from '../../../models/TableModel/Column';
import { IdType } from '../../../models/IdType';
import { ValueTypeName } from '../../../models/TableModel';
import { getResonableCompatibleConvertionType } from '../utils/attributes-operations';

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
    const currentValue = (rowData[column] && rowData[column] !== 'None') ? rowData[column] : '';
    const netIdLst = netLst.map(pair => pair[1]);

    // Handler for 'Dropdown' changes
    const onDropdownChange = (e: SelectChangeEvent<any>, type: TableView, rowData: { [x: string]: any; }, field: string) => {
        const updateTable = (prevTable: MatchingTableRow[]) => {

            const updatedTable = prevTable.map(row => {
                if (row.id === rowData.id) {
                    const typeSet = new Set<ValueTypeName>();
                    const initType = columns.find(col => col.name === e.target.value)?.type
                    if (initType !== undefined) typeSet.add(initType);
                    netIdLst.forEach(netId => {
                        if (netId !== field && row[netId] !== 'None') {
                            const colType = networkRecords[netId]?.[tableType]?.columns.find(col => col.name === row[netId])?.type;
                            if (colType !== undefined) typeSet.add(colType);
                        }
                    });
                    const numConflicts = typeSet.size <= 1 ? 0 : 1;
                    const mergedType = getResonableCompatibleConvertionType(typeSet);
                    return { ...row, [field]: e.target.value, numConflicts, type: mergedType } as MatchingTableRow;
                }
                return row;
            });
            return filterRows(updatedTable);
        };
        if (type === TableView.node) {
            setNodeMatchingTable(prevTable => updateTable(prevTable));
            if (rowData.id === 0) {
                setMatchingCols(prevCols => {
                    const columnType = networkRecords[e.target.value]?.nodeTable?.columns.find(col => col.name === e.target.value)?.type || 'None';
                    return { ...prevCols, [field]: { name: e.target.value, type: columnType } as Column };
                });
            }
        } else if (type === TableView.edge) {
            setEdgeMatchingTable(prevTable => updateTable(prevTable));
        } else if (type === TableView.network) {
            setNetMatchingTable(prevTable => updateTable(prevTable));
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
