import React from "react";
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { TableView } from "../models/DataInterfaceForMerge";
import { getAllConvertiableTypes } from "../utils/attributes-operations";
import { MatchingTableRow } from "../models/MatchingTable";
import { ValueTypeName } from "../../../models/TableModel";

interface typeDropDownTemplateProps {
    type: TableView;
    rowData: MatchingTableRow;
    netLst: [string, string][];
    setNodeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setEdgeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setNetMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
}

export const TypeDropDownTemplate = React.memo(({ type, rowData, netLst, setNodeMatchingTable, setEdgeMatchingTable, setNetMatchingTable }: typeDropDownTemplateProps) => {
    const typeLst: Set<ValueTypeName | 'None'> = new Set(netLst.filter(pair => rowData.typeRecord.hasOwnProperty(pair[1])).map(pair => rowData.typeRecord[pair[1]]));
    const convertiableTypes = getAllConvertiableTypes(typeLst);
    const typeOptions = convertiableTypes.map(type => ({ label: type, value: type }));
    const onDropDownChange = (e: SelectChangeEvent<any>, type: TableView, rowData: MatchingTableRow) => {
        const updateTable = (prevTable: MatchingTableRow[]) => {
            const updatedTable = prevTable.map(row => {
                if (row.id === rowData.id) return { ...row, type: e.target.value as ValueTypeName } as MatchingTableRow;
                return row;
            });
            return updatedTable;
        }
        if (type === TableView.node) setNodeMatchingTable(prevTable => updateTable(prevTable));
        else if (type === TableView.edge) setEdgeMatchingTable(prevTable => updateTable(prevTable));
        else if (type === TableView.network) setNetMatchingTable(prevTable => updateTable(prevTable));
    }

    return (
        <FormControl id={`formcontrol-${rowData.id}-type`}>
            <Select
                labelId={`select-label-${rowData.id}-type`}
                value={rowData.type}
                onChange={(e) => onDropDownChange(e, type, rowData)}
                style={{ minWidth: 100, maxWidth: 200 }}
            >
                {typeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
});

