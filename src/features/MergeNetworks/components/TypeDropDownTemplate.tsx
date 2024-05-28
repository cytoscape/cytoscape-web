import React from "react";
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { TableView } from "../models/DataInterfaceForMerge";
import { getAllConvertiableTypes } from "../utils/attributes-operations";

interface typeDropDownTemplateProps {
    type: TableView;
    rowData: { [x: string]: any; };
    netLst: [string, string][];
}

export const TypeDropDownTemplate = React.memo(({ type, rowData, netLst }: typeDropDownTemplateProps) => {
    const typeLst: = netLst.map(pair => rowData[pair[1]]);
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

