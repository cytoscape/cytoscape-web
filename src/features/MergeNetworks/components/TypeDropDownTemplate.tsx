import React from "react";
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { TableView } from "../models/DataInterfaceForMerge";
import { getAllConvertiableTypes } from "../utils/attributes-operations";
import { MatchingTableRow } from "../models/MatchingTable";

interface typeDropDownTemplateProps {
    type: TableView;
    rowData: { [x: string]: any; };
    netLst: [string, string][];
    setNodeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setEdgeMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
    setNetMatchingTable: (updateFunction: (prevTable: MatchingTableRow[]) => MatchingTableRow[]) => void;
}

export const TypeDropDownTemplate = React.memo(({ type, rowData, netLst }: typeDropDownTemplateProps) => {
    const typeLst: Set<ValueTypeName> = new Set(netLst.map(pair => rowData.typeRecord[pair[1]]));

    const typeOptions = getAllConvertiableTypes();

    const onDropDownChange = (e: SelectChangeEvent<any>, type: TableView, rowData: { [x: string]: any; }, field: string) => {

    }
    return (
        <FormControl id={`formcontrol-${rowData.id}-type`}>
            <Select
                labelId={`select-label-${rowData.id}-type`}
                onChange={(e) => onDropdownChange(e, type, rowData, column)}
                style={{ minWidth: 100, maxWidth: 200 }}
            >
                {typeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>

                    >
                ))}
            </Select>
        </FormControl>
    )
});

