import React from 'react';
import { MatchingTableRow } from '../models/MatchingTable';
import { NetworkRecord, TableView } from '../models/DataInterfaceForMerge';
import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { Column } from '../../../models/TableModel/Column';
import { IdType } from '../../../models/IdType';
import { ValueTypeName } from '../../../models/TableModel';
import { getResonableCompatibleConvertionType } from '../utils/attributes-operations';
import useMatchingColumnsStore from '../store/matchingTableStore';

interface netAttDropDownTemplateProps {
    networkRecords: Record<IdType, NetworkRecord>
    rowData: MatchingTableRow;
    column: string;
    type: TableView;
    netLst: [string, string][];
    setNodeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setEdgeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setNetMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
}


// Editable cell template for the network attributes
export const NetAttDropDownTemplate = React.memo(({ networkRecords, rowData, column, type, netLst, setNodeMatchingTable, setEdgeMatchingTable, setNetMatchingTable }: netAttDropDownTemplateProps) => {
    const emptyOption = { label: 'None', value: 'None' };
    const tableType = type === TableView.node ? 'nodeTable' : (type === TableView.edge ? 'edgeTable' : 'netTable');
    const columns = networkRecords[column]?.[tableType]?.columns || [];
    const networkOptions = (type === TableView.node && rowData.id === 0) ? columns.map(nc => ({ label: nc.name, value: nc.name })) : [...columns.map(nc => ({ label: nc.name, value: nc.name })), emptyOption];
    const currentValue = (rowData.nameRecord[column] && rowData.nameRecord[column] !== 'None') ? rowData.nameRecord[column] : '';
    const netIdLst = netLst.map(pair => pair[1]);
    const setMatchingCols = useMatchingColumnsStore(state => state.setMatchingCols);
    // Handler for 'Dropdown' changes
    const onDropdownChange = (e: SelectChangeEvent<any>, type: TableView, rowData: MatchingTableRow, field: string) => {
        const newName = e.target.value;
        const newType = columns.find(col => col.name === newName)?.type || 'None';
        const updateTable = (prevTable: MatchingTableRow[]) => {

            const updatedTable = prevTable.map(row => {
                if (row.id === rowData.id) {
                    const typeSet = new Set<ValueTypeName>();
                    const newNameRecord = { ...row.nameRecord, [field]: newName };
                    const newTypeRecord = { ...row.typeRecord, [field]: newType };
                    Object.values(newTypeRecord).forEach(type => {
                        if (type !== 'None') typeSet.add(type as ValueTypeName)
                    });
                    const hasConflicts = typeSet.size > 1;
                    const mergedType = getResonableCompatibleConvertionType(typeSet);
                    return { ...row, nameRecord: newNameRecord, typeRecord: newTypeRecord, hasConflicts, type: mergedType } as MatchingTableRow;
                }
                return row;
            });
            return filterRows(updatedTable);
        };
        if (type === TableView.node) {
            setNodeMatchingTable(prevTable => updateTable(prevTable));
            if (rowData.id === 0) {
                setMatchingCols({ [field]: { name: newName, type: newType } as Column });
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
        const allNone = Object.keys(row.nameRecord).every(key => row.nameRecord[key] === 'None');
        return !allNone;
    });
};
