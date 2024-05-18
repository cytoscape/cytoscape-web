import React from 'react';
import { MatchingTableRow } from '../models/MatchingTable';
import { NetworkRecord, TableView } from '../models/DataInterfaceForMerge';
import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { Column } from '../../../models/TableModel/Column';
import { IdType } from '../../../models/IdType';

interface netAttDropDownTemplateProps {
    networkRecords: Record<IdType, NetworkRecord>
    rowData: { [x: string]: any; };
    column: string;
    type: TableView;
    setNodeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setEdgeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setNetMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setMatchingCols: (updateFunction: (prevCols: Record<string, Column>) => Record<string, Column>) => void;
}


// Editable cell template for the network attributes
export const NetAttDropDownTemplate = React.memo(({ networkRecords, rowData, column, type, setNodeMatchingTable, setEdgeMatchingTable, setNetMatchingTable, setMatchingCols }: netAttDropDownTemplateProps) => {
    const emptyOption = { label: 'None', value: 'None' };
    const tableType = type === TableView.node ? 'nodeTable' : (type === TableView.edge ? 'edgeTable' : 'netTable');
    const columns = networkRecords[column]?.[tableType]?.columns || [];
    const networkOptions = [...columns.map(nc => ({ label: nc.name, value: nc.name })), emptyOption];
    const currentValue = (networkOptions.some(option => option.value === rowData[column]) && rowData[column] !== 'None') ? rowData[column] : '';

    // Handler for 'Dropdown' changes
    const onDropdownChange = (e: SelectChangeEvent<any>, type: TableView, rowData: { [x: string]: any; }, field: string) => {
        if (type === TableView.node) {
            setNodeMatchingTable(prevTable => {
                const updatedTable = prevTable.map(row => {
                    if (row.id === rowData.id) {
                        return { ...row, [field]: e.target.value };
                    }
                    return row;
                });

                // Filter out rows where all network fields are 'None'
                return updatedTable.filter(row => {
                    // Check all network IDs in the row except the 'mergedNetwork' and 'type' fields
                    const allNone = Object.keys(row)
                        .filter(key => key !== 'mergedNetwork' && key !== 'type' && key !== 'id')
                        .every(key => row[key] === 'None');
                    return !allNone;  // Keep rows that do not have all 'None'
                });
            });
            if (rowData.id === 0) {
                setMatchingCols(prevCols => {
                    return { ...prevCols, [field]: { name: e.target.value, type: networkRecords[e.target.value]?.nodeTable?.columns.find(col => col.name === e.target.value)?.type || 'None' } as Column }
                })
            }
        } else if (type === TableView.edge) {
            setEdgeMatchingTable(prevTable => {
                const updatedTable = prevTable.map(row => {
                    if (row.id === rowData.id) {
                        return { ...row, [field]: e.target.value };
                    }
                    return row;
                });
                return updatedTable.filter(row => {
                    const allNone = Object.keys(row)
                        .filter(key => key !== 'mergedNetwork' && key !== 'type' && key !== 'id')
                        .every(key => row[key] === 'None');
                    return !allNone;
                });
            })
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

