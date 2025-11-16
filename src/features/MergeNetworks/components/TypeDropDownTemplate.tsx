import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material'
import React from 'react'

import { ValueTypeName } from '../../../models/TableModel'
import { TableView } from '../models/DataInterfaceForMerge'
import { MatchingTableRow } from '../models/MatchingTable'
import useEdgeMatchingTableStore from '../store/edgeMatchingTableStore'
import useNetMatchingTableStore from '../store/netMatchingTableStore'
import useNodeMatchingTableStore from '../store/nodeMatchingTableStore'
import { getAllConvertiableTypes } from '../utils/attributesOperationsUtil'

interface typeDropDownTemplateProps {
  type: TableView
  rowData: MatchingTableRow
  rowIndex: number
  netLst: [string, string][]
}

export const TypeDropDownTemplate = React.memo(
  ({ type, rowData, rowIndex, netLst }: typeDropDownTemplateProps) => {
    const typeLst: Set<ValueTypeName | 'None'> = new Set(
      netLst
        .filter((pair) => rowData.typeRecord.hasOwnProperty(pair[1]))
        .map((pair) => rowData.typeRecord[pair[1]]),
    )
    const typeOptions = getAllConvertiableTypes(typeLst).map((type) => ({
      label: type,
      value: type,
    }))
    const setMatchingTable =
      type === TableView.node
        ? useNodeMatchingTableStore((state) => state.setRow)
        : type === TableView.edge
          ? useEdgeMatchingTableStore((state) => state.setRow)
          : useNetMatchingTableStore((state) => state.setRow)
    const onDropDownChange = (
      e: SelectChangeEvent<any>,
      rowData: MatchingTableRow,
    ) => {
      const updatedRow: MatchingTableRow = {
        ...rowData,
        type: e.target.value as ValueTypeName,
      }
      setMatchingTable(rowIndex, updatedRow)
    }

    return (
      <FormControl id={`formcontrol-${rowData.id}-type`}>
        <Select
          data-testid={`merge-type-dropdown-${rowData.id}`}
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
  },
)
