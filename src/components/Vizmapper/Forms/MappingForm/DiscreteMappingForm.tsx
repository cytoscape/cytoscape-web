import * as React from 'react'
import {
  Box,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  Checkbox,
  IconButton,
  Divider,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

import { IdType } from '../../../../models/IdType'
// import { ValueType } from '../../../../models/TableModel'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'
import { useTableStore } from '../../../../store/TableStore'

import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { DiscreteMappingFunction } from '../../../../models/VisualStyleModel/VisualMappingFunction'

import { VisualPropertyValueForm } from '../VisualPropertyValueForm'

export function DiscreteMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const mapping = props.visualProperty.mapping

  const deleteDiscreteMappingValue = useVisualStyleStore(
    (state) => state.deleteDiscreteMappingValue,
  )

  const setDiscreteMappingValue = useVisualStyleStore(
    (state) => state.setDiscreteMappingValue,
  )

  //   const tables: Record<IdType, { nodeTable: Table; edgeTable: Table }> =
  //     useTableStore((state) => state.tables)
  //   const nodeTable = tables[props.currentNetworkId]?.nodeTable
  //   const edgeTable = tables[props.currentNetworkId]?.edgeTable
  //   const currentTable =
  //     props.visualProperty.group === 'node' ? nodeTable : edgeTable
  const columnValues = useTableStore((state) => state.columnValues)

  const discreteMappingEntries = Array.from(
    (mapping as DiscreteMappingFunction)?.vpValueMap?.entries() ?? new Map(),
  )

  if (props.visualProperty.group === 'network') {
    return <Box></Box>
  }

  const values = columnValues(
    props.currentNetworkId,
    props.visualProperty.group as 'node' | 'edge',
    mapping?.attribute ?? '',
  )
  console.log(values)

  return (
    <Box>
      <TableContainer sx={{ height: 400, overflow: 'auto' }}>
        <Table size={'small'} stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={false}
                  indeterminate={false}
                  onClick={() => {
                    // if (allSelected) {
                    //   additiveUnselect(
                    //     currentNetworkId,
                    //     elementsToRender.map((e) => e.id),
                    //   )
                    // } else {
                    //   additiveSelect(
                    //     currentNetworkId,
                    //     elementsToRender.map((e) => e.id),
                    //   )
                    // }
                  }}
                />
              </TableCell>
              <TableCell>{mapping?.attribute}</TableCell>
              <TableCell>{props.visualProperty.displayName}</TableCell>
              <TableCell padding={'none'}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ overflow: 'scroll' }}>
            {discreteMappingEntries.map(([key, value], index) => {
              return (
                <TableRow key={index} hover={true} selected={false}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      //   onClick={() => toggleSelected(currentNetworkId, [id])}
                      checked={false}
                    />
                  </TableCell>
                  <TableCell>{key}</TableCell>
                  <TableCell>
                    <VisualPropertyValueForm
                      visualProperty={props.visualProperty}
                      currentValue={value}
                      onValueChange={(newValue) => {
                        setDiscreteMappingValue(
                          props.currentNetworkId,
                          props.visualProperty.name,
                          key,
                          newValue,
                        )
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        deleteDiscreteMappingValue(
                          props.currentNetworkId,
                          props.visualProperty.name,
                          key,
                        )
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Button size="small" color="error" onClick={() => {}}>
            Remove selected
          </Button>
        </Box>
        <Box sx={{ m: 1, mr: 0, display: 'flex', justifyContent: 'end' }}>
          <VisualPropertyValueForm
            visualProperty={props.visualProperty}
            currentValue={props.visualProperty.defaultValue}
            onValueChange={() => {}}
          />
          <Button
            sx={{ ml: 1 }}
            size="small"
            variant="contained"
            // disabled={!validElementsSelected}
            // onClick={() => {
            //   const selectedElementIds = selectedElements.map((e) => e.id)
            //   setBypass(
            //     currentNetworkId,
            //     visualProperty.name,
            //     selectedElementIds,
            //     bypassValue,
            //   )
            // }}
          >
            Apply to selected
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
