import React from "react";
import { Column } from "../../../models/TableModel/Column";
import { NetworkRecord, Pair } from "../models/DataInterfaceForMerge";
import { MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material"


interface MatchingTableProps {
    networkRecords: Record<string, NetworkRecord>;
    toMergeNetworksList: Pair<string, string>[];
    matchingCols: Record<string, Column>;
    setMatchingCols: (updateFunction: (prevCols: Record<string, Column>) => Record<string, Column>) => void;
}

export const MatchingColumnTable = React.memo(({ networkRecords, toMergeNetworksList, matchingCols, setMatchingCols }: MatchingTableProps) => {
    const placeHolderForMatchingCol = "Please select networks to merge..."
    // Handler for the 'Matching Columns' dropdown changes
    const handleSetMatchingCols = (networkId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setMatchingCols(prevCols => {
            return {
                ...prevCols,
                [networkId]: {
                    name: event.target.value,
                    type: networkRecords[networkId]?.nodeTable?.columns.find(col => col.name === event.target.value)?.type || 'None'
                } as Column
            }
        });
    };

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    {toMergeNetworksList.length > 0 ?
                        (<TableRow>
                            {toMergeNetworksList.map(net => (
                                <TableCell key={net[1]}>{net[0]}</TableCell>
                            ))}
                        </TableRow>) :
                        (<TableRow>
                            <TableCell>{placeHolderForMatchingCol}</TableCell>
                        </TableRow>)
                    }
                </TableHead>
                <TableBody>
                    <TableRow>
                        {toMergeNetworksList.map(net => (
                            <TableCell key={net[1]}>
                                <Select
                                    value={matchingCols[net[1]]?.name || ''}
                                    onChange={handleSetMatchingCols(net[1])}
                                >
                                    {networkRecords[net[1]]?.nodeTable.columns.map((column) => (
                                        <MenuItem key={column.name} value={column.name}>
                                            {column.name}
                                        </MenuItem>
                                    )) ?? ''}
                                </Select>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    )
}
)