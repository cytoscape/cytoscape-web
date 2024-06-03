import React from 'react';
import { MatchingTableRow } from '../models/MatchingTable';
import { NetworkRecord, TableView } from '../models/DataInterfaceForMerge';
import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { Column } from '../../../models/TableModel/Column';
import { IdType } from '../../../models/IdType';
import { ValueTypeName } from '../../../models/TableModel';
import { getResonableCompatibleConvertionType } from '../utils/attributes-operations';
import useMatchingColumnsStore from '../store/matchingColumnStore';
import useNodeMatchingTableStore from '../store/nodeMatchingTableStore';
import useEdgeMatchingTableStore from '../store/edgeMatchingTableStore';
import useNetMatchingTableStore from '../store/netMatchingTableStore';

interface netAttDropDownTemplateProps {
    networkRecords: Record<IdType, NetworkRecord>
    rowData: MatchingTableRow;
    column: string;
    type: TableView;
    netLst: [string, string][];
}


// Editable cell template for the network attributes
export const NetAttDropDownTemplate = React.memo(({ networkRecords, rowData, column, type, netLst }: netAttDropDownTemplateProps) => {
    const emptyOption = { label: 'None', value: 'None' };
    const tableType = type === TableView.node ? 'nodeTable' : (type === TableView.edge ? 'edgeTable' : 'netTable');
    const columns = networkRecords[column]?.[tableType]?.columns || [];
    const networkOptions = (type === TableView.node && rowData.id === 0) ? columns.map(nc => ({ label: nc.name, value: nc.name })) : [...columns.map(nc => ({ label: nc.name, value: nc.name })), emptyOption];
    const currentValue = (rowData.nameRecord[column] && rowData.nameRecord[column] !== 'None') ? rowData.nameRecord[column] : '';
    const netIdLst = netLst.map(pair => pair[1]);
    const setMatchingCols = useMatchingColumnsStore(state => state.setMatchingCols);
    const setMatchingTable = (type === TableView.node) ? useNodeMatchingTableStore(state => state.setRow) :
        (type === TableView.edge ? useEdgeMatchingTableStore(state => state.setRow) : useNetMatchingTableStore(state => state.setRow));
    // Handler for 'Dropdown' changes
    const onDropdownChange = (e: SelectChangeEvent<any>, tableType: TableView, rowData: MatchingTableRow, field: string) => {
        const newName = e.target.value;
        const newType = columns.find(col => col.name === newName)?.type || 'None';
        const newNameRecord = { ...rowData.nameRecord, [field]: newName };
        const newTypeRecord: Record<string, "None" | ValueTypeName> = { ...rowData.typeRecord, [field]: newType };
        const typeSet = new Set<ValueTypeName>();
        Object.values(newTypeRecord).forEach(type => {
            if (type !== 'None') typeSet.add(type as ValueTypeName)
        });
        const hasConflicts = typeSet.size > 1;
        const mergedType = getResonableCompatibleConvertionType(typeSet);
        const updatedRow: MatchingTableRow = {
            ...rowData, nameRecord: newNameRecord, typeRecord: newTypeRecord, hasConflicts, type: mergedType
        };
        if (tableType === TableView.node && rowData.id === 0) {
            setMatchingCols({ [field]: { name: newName, type: newType } as Column });
        }
        setMatchingTable(rowData.id, updatedRow);
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