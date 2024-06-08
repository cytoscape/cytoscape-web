import React from "react";
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { TableView } from "../models/DataInterfaceForMerge";
import { getAllConvertiableTypes } from "../utils/attributes-operations";
import { MatchingTableRow } from "../models/MatchingTable";
import { ValueTypeName } from "../../../models/TableModel";
import useNodeMatchingTableStore from '../store/nodeMatchingTableStore';
import useEdgeMatchingTableStore from '../store/edgeMatchingTableStore';
import useNetMatchingTableStore from '../store/netMatchingTableStore';

interface typeDropDownTemplateProps {
    type: TableView;
    rowData: MatchingTableRow;
    netLst: [string, string][];
}

export const TypeDropDownTemplate = React.memo(({ type, rowData, netLst }: typeDropDownTemplateProps) => {
    const typeLst: Set<ValueTypeName | 'None'> = new Set(netLst.filter(pair => rowData.typeRecord.hasOwnProperty(pair[1])).map(pair => rowData.typeRecord[pair[1]]));
    const typeOptions = getAllConvertiableTypes(typeLst).map(type => ({ label: type, value: type }));
    const setMatchingTable = (type === TableView.node) ? useNodeMatchingTableStore(state => state.setRow) :
        (type === TableView.edge ? useEdgeMatchingTableStore(state => state.setRow) : useNetMatchingTableStore(state => state.setRow));
    const onDropDownChange = (e: SelectChangeEvent<any>, rowData: MatchingTableRow) => {
        const updatedRow: MatchingTableRow = { ...rowData, type: e.target.value as ValueTypeName };
        setMatchingTable(rowData.id, updatedRow);
    }

    return (
        <FormControl id={`formcontrol-${rowData.id}-type`}>
            <Select
                labelId={`select-label-${rowData.id}-type`}
                value={rowData.type}
                onChange={(e) => onDropDownChange(e, rowData)}
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

