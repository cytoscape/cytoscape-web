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
  Typography,
  Tooltip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import { IdType } from '../../../../models/IdType'
import { ValueType } from '../../../../models/TableModel'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'
import { useTableStore } from '../../../../store/TableStore'

import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { DiscreteMappingFunction } from '../../../../models/VisualStyleModel/VisualMappingFunction'

import { VisualPropertyValueForm } from '../VisualPropertyValueForm'
import { VisualPropertyGroup } from '../../../../models/VisualStyleModel/VisualPropertyGroup'
import { UndoCommandType } from '../../../../models/StoreModel/UndoStoreModel'
import { useUndoStack } from '../../../../task/UndoStack'

export function DiscreteMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const { postEdit } = useUndoStack()

  const mapping = props.visualProperty.mapping as DiscreteMappingFunction

  const [selectedDiscreteMappingEntries, setSelectedDiscreteMappingEntries] =
    React.useState(new Set())
  const deleteDiscreteMappingValue = useVisualStyleStore(
    (state) => state.deleteDiscreteMappingValue,
  )

  React.useEffect(() => {
    setSelectedDiscreteMappingEntries(new Set())
  }, [mapping])

  const [
    currentDiscreteMappingformVPValue,
    setCurrentDiscreteMappingformVPValue,
  ] = React.useState<VisualPropertyValueType>(props.visualProperty.defaultValue)

  const setDiscreteMappingValue = useVisualStyleStore(
    (state) => state.setDiscreteMappingValue,
  )

  const columnValues = useTableStore((state) => state.columnValues)
  const existingMappingKeys = Array.from(
    mapping?.vpValueMap?.keys() ?? new Set(),
  )

  const toggleSelected = (key: ValueType, selected: boolean): void => {
    const nextDiscreteMappingEntries = new Set(selectedDiscreteMappingEntries)
    selected
      ? nextDiscreteMappingEntries.delete(key)
      : nextDiscreteMappingEntries.add(key)
    setSelectedDiscreteMappingEntries(nextDiscreteMappingEntries)
  }

  if (props.visualProperty.group === VisualPropertyGroup.Network) {
    return <Box></Box>
  }

  // all values found in the specific column
  const networkAttributeValues = columnValues(
    props.currentNetworkId,
    props.visualProperty.group,
    mapping?.attribute ?? '',
  )

  // get set of all keys in the mapping and the set of values in the column
  const allMappingKeys = Array.from(
    new Set([...existingMappingKeys, ...Array.from(networkAttributeValues)]),
  )

  // const allMappingKeys = Array.from(
  //   new Set([
  //     ...existingMappingKeys,
  //     ...Array.from(networkAttributeValues).map((v) =>
  //       Array.isArray(v) ? v.join(',') : v,
  //     ),
  //   ]),
  // )

  const mappingKeysNotInColumn = allMappingKeys.filter(
    (mk) => !networkAttributeValues.has(mk),
  )
  const mappingKeysInColumn = allMappingKeys.filter((mk) =>
    networkAttributeValues.has(mk),
  )

  // order elements by whether they are in the column or not first
  // all other mapping keys not in the column are at the end
  const elementsToRender = [
    ...mappingKeysInColumn,
    ...mappingKeysNotInColumn,
  ].map((k) => {
    return {
      key: k,
      inColumn: networkAttributeValues.has(k),
    }
  })

  const allSelected =
    elementsToRender.length === selectedDiscreteMappingEntries.size
  const someSelected = selectedDiscreteMappingEntries.size > 0
  return (
    <Box>
      <TableContainer sx={{ width: '460px', height: '400px' }}>
        <Table size={'small'} stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ maxWidth: '55px' }} padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onClick={() => {
                    if (allSelected) {
                      setSelectedDiscreteMappingEntries(new Set())
                    } else {
                      setSelectedDiscreteMappingEntries(
                        new Set(elementsToRender.map((e) => e.key)),
                      )
                    }
                  }}
                />
              </TableCell>
              <TableCell
                sx={{
                  maxWidth: '205px',
                }}
              >
                <Box
                  sx={{
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mapping?.attribute}
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: '100px' }} align="center">
                <Box>{props.visualProperty.displayName}</Box>
              </TableCell>
              <TableCell sx={{ maxWidth: '85px' }} align="center">
                <Box>Remove</Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ overflowY: 'auto' }}>
            {elementsToRender.map(({ key, inColumn }, index) => {
              const value = mapping?.vpValueMap?.get(key) ?? null
              const selected = selectedDiscreteMappingEntries.has(key)
              return (
                <TableRow key={index} hover={true} selected={false}>
                  <TableCell sx={{ maxWidth: '55px' }} padding="checkbox">
                    <Checkbox
                      onClick={() => toggleSelected(key, selected)}
                      checked={selected}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: '205px' }}>
                    {!inColumn ? (
                      <Box
                        sx={{
                          maxWidth: '220px',
                          display: 'flex',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Tooltip
                          title={`Value '${String(
                            key,
                          )}' is not found in the column '${
                            mapping?.attribute ?? ''
                          }'.  You will not be able to re-edit this entry if you delete this value from the discrete mapping. `}
                        >
                          <WarningAmberIcon sx={{ color: '#f0ad4e', mr: 1 }} />
                        </Tooltip>
                        <Box
                          sx={{
                            mt: 0.2,
                            maxWidth: '180px',
                            overflowX: 'auto',
                          }}
                        >
                          {key}
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          maxWidth: '220px',
                          overflowX: 'auto',
                        }}
                        display="flex"
                        justifyContent="flex-start"
                      >{`${key}`}</Box>
                    )}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      minWidth: '100px',
                    }}
                  >
                    <Box display="flex" justifyContent="center">
                      <VisualPropertyValueForm
                        visualProperty={props.visualProperty}
                        currentValue={value}
                        currentNetworkId={props.currentNetworkId}
                        onValueChange={(newValue) => {
                          const prevMap = mapping?.vpValueMap ?? new Map()
                          postEdit(
                            UndoCommandType.SET_DISCRETE_VALUE,
                            'Set discrete value',
                            [
                              props.currentNetworkId,
                              props.visualProperty.name,
                              [key],
                              prevMap.get(key),
                            ],
                            [
                              props.currentNetworkId,
                              props.visualProperty.name,
                              [key],
                              newValue,
                            ],
                          )
                          setDiscreteMappingValue(
                            props.currentNetworkId,
                            props.visualProperty.name,
                            [key],
                            newValue,
                          )
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: '85px' }} align="center">
                    <IconButton
                      disabled={value == null}
                      onClick={() => {
                        const prevMap = mapping?.vpValueMap ?? new Map()
                        postEdit(
                          UndoCommandType.DELETE_DISCRETE_VALUE,
                          'Delete discrete value',
                          [
                            props.currentNetworkId,
                            props.visualProperty.name,
                            [key],
                            prevMap.get(key),
                          ],
                          [
                            props.currentNetworkId,
                            props.visualProperty.name,
                            [key],
                            mapping?.vpValueMap?.get(key),
                          ],
                        )
                        deleteDiscreteMappingValue(
                          props.currentNetworkId,
                          props.visualProperty.name,
                          [key],
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
          mt: 2.2,
        }}
      >
        <Box>
          <Button
            size="small"
            sx={{
              color: '#F50157',
              backgroundColor: 'transparent',
              '&:hover': {
                color: '#FFFFFF',
                backgroundColor: '#F50157',
              },
              '&:disabled': {
                backgroundColor: 'transparent',
              },
            }}
            disabled={selectedDiscreteMappingEntries.size === 0}
            onClick={() => {
              postEdit(
                UndoCommandType.DELETE_DISCRETE_VALUE_MAP,
                'Remove selected discrete values',
                [
                  props.currentNetworkId,
                  props.visualProperty.name,
                  props.visualProperty.mapping,
                ],
                [
                  props.currentNetworkId,
                  props.visualProperty.name,
                  Array.from(selectedDiscreteMappingEntries) as ValueType[],
                ],
              )
              deleteDiscreteMappingValue(
                props.currentNetworkId,
                props.visualProperty.name,
                Array.from(selectedDiscreteMappingEntries) as ValueType[],
              )
            }}
          >
            Remove selected
          </Button>
        </Box>
        <Box sx={{ m: 0, display: 'flex', justifyContent: 'end' }}>
          <VisualPropertyValueForm
            visualProperty={props.visualProperty}
            currentValue={currentDiscreteMappingformVPValue}
            currentNetworkId={props.currentNetworkId}
            onValueChange={(newValue) =>
              setCurrentDiscreteMappingformVPValue(newValue)
            }
          />
          <Button
            sx={{ ml: 1 }}
            size="small"
            variant="contained"
            disabled={selectedDiscreteMappingEntries.size === 0}
            onClick={() => {
              postEdit(
                UndoCommandType.SET_DISCRETE_VALUE_MAP,
                'Apply to selected discrete values',
                [
                  props.currentNetworkId,
                  props.visualProperty.name,
                  props.visualProperty.mapping,
                ],
                [
                  props.currentNetworkId,
                  props.visualProperty.name,
                  Array.from(selectedDiscreteMappingEntries) as ValueType[],
                  currentDiscreteMappingformVPValue,
                ],
              )
              setDiscreteMappingValue(
                props.currentNetworkId,
                props.visualProperty.name,
                Array.from(selectedDiscreteMappingEntries) as ValueType[],
                currentDiscreteMappingformVPValue,
              )
            }}
          >
            Apply to selected
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
