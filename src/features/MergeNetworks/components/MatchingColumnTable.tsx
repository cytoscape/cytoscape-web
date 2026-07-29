import {
  MenuItem,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import React from 'react'

import { Column } from '../../../models/TableModel/Column'
import { NetworkRecord, Pair } from '../models/DataInterfaceForMerge'
import useMatchingColumnsStore from '../store/matchingColumnStore'
import useNodeMatchingTableStore from '../store/nodeMatchingTableStore'
import useNodesDuplicationStore from '../store/nodesDuplicationStore'
import { checkDuplication } from '../utils/mergeNetworkUtil'

interface MatchingTableProps {
  networkRecords: Record<string, NetworkRecord>
  toMergeNetworksList: Pair<string, string>[]
  matchingCols: Record<string, Column>
}

export const MatchingColumnTable = React.memo(
  ({
    networkRecords,
    toMergeNetworksList,
    matchingCols,
  }: MatchingTableProps) => {
    const setMatchingCols = useMatchingColumnsStore(
      (state) => state.setMatchingCols,
    )
    const updateNodeMatchingTable = useNodeMatchingTableStore(
      (state) => state.updateRow,
    )
    const setHasDuplication = useNodesDuplicationStore(
      (state) => state.setHasDuplication,
    )
    // Handler for the 'Matching Columns' dropdown changes
    const handleSetMatchingCols =
      (networkId: string) => (event: SelectChangeEvent<string>) => {
        const colType =
          networkRecords[networkId]?.nodeTable?.columns.find(
            (col) => col.name === event.target.value,
          )?.type || 'None'
        if (colType === 'None') return
        const newCol: Column = { name: event.target.value, type: colType }
        setMatchingCols({ [networkId]: newCol })
        updateNodeMatchingTable(0, networkId, newCol)
        setHasDuplication(
          networkId,
          checkDuplication(
            networkRecords[networkId]?.nodeTable,
            event.target.value,
          ),
        )
      }

    return (
      <TableContainer sx={{ overflowY: 'auto', border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
        <Table>
          <TableHead>
            {toMergeNetworksList.length > 0 ? (
              <TableRow sx={{ backgroundColor: (theme) => theme.palette.background.subtle }}>
                {toMergeNetworksList.map((net) => (
                  <TableCell key={net[1]} sx={{ py: 1 }}>{net[0]}</TableCell>
                ))}
              </TableRow>
            ) : (
              <TableRow>
                <TableCell sx={{ textAlign: 'center', color: (theme) => theme.palette.text.disabled, fontWeight: 'normal' }} colSpan={2}>
                  -- Please select networks to merge --
                </TableCell>
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            <TableRow>
              {toMergeNetworksList.map((net) => (
                <TableCell key={net[1]} sx={{ py: 0.5 }}>
                  <Select
                    data-testid={`merge-matching-column-select-${net[1]}`}
                    size="small"
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
  },
)

MatchingColumnTable.displayName = 'MatchingColumnTable'
