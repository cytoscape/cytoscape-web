import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Input,
  IconButton,
  Button,
  Typography,
  Paper,
} from '@mui/material'

import Delete from '@mui/icons-material/Delete'
import { ValueTypeName, ValueType } from '../../models/TableModel'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import {
  deserializeValue,
  getDefaultValue,
} from '../../models/TableModel/impl/ValueTypeImpl'
import { NdexNetworkProperty } from '../../models/NetworkSummaryModel'
import { ValueForm } from '../ValueType'

const NdexNetworkPropertyTable = (): React.ReactElement => {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networkProperties = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId].properties,
  )

  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)

  const updateNetworkPropertyType = (
    index: number,
    dataType: ValueTypeName,
  ): void => {
    const nextProperties = [...networkProperties]
    const nextProperty = Object.assign({}, nextProperties[index], {
      dataType,
      value: getDefaultValue(dataType),
    })

    nextProperties[index] = nextProperty
    updateNetworkSummary(currentNetworkId, {
      properties: nextProperties,
    })
  }

  const updateNetworkPropertyName = (index: number, name: string): void => {
    const nextProperties = [...networkProperties]
    const nextProperty = Object.assign({}, nextProperties[index], {
      predicateString: name,
    })

    nextProperties[index] = nextProperty
    updateNetworkSummary(currentNetworkId, {
      properties: nextProperties,
    })
  }

  const updateNetworkPropertyValue = (
    index: number,
    value: ValueType,
  ): void => {
    const nextProperties = [...networkProperties]
    const nextValue = deserializeValue(
      nextProperties[index].dataType,
      value as string,
    )
    const nextProperty = Object.assign({}, nextProperties[index], {
      value: nextValue,
    })

    nextProperties[index] = nextProperty

    updateNetworkSummary(currentNetworkId, {
      properties: nextProperties,
    })
  }

  const addNetworkProperty = (): void => {
    const existingPropertyNames = new Set(
      networkProperties.map((p) => p.predicateString),
    )
    const newPropertyName = (counter: number): string =>
      `new property ${counter}`

    let newPropertyCounter = 0
    while (existingPropertyNames.has(newPropertyName(newPropertyCounter))) {
      newPropertyCounter++
    }
    const defaultNewProperty: NdexNetworkProperty = {
      subNetworkId: null,
      predicateString: newPropertyName(newPropertyCounter),
      dataType: ValueTypeName.String,
      value: getDefaultValue(ValueTypeName.String),
    }

    const nextProperties = [...networkProperties, defaultNewProperty]
    updateNetworkSummary(currentNetworkId, {
      properties: nextProperties,
    })
  }

  const deleteNetworkProperty = (index: number): void => {
    const nextProperties = [...networkProperties]
    nextProperties.splice(index, 1)
    updateNetworkSummary(currentNetworkId, {
      properties: nextProperties,
    })
  }

  return (
    <Paper sx={{ backgroundColor: '#D9D9D9', p: 1, pr: 2, pl: 2 }}>
      <Typography gutterBottom>Network Properties</Typography>
      <TableContainer
        sx={{ height: 300, overflowY: 'scroll' }}
        component={Paper}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data Type</TableCell>
              <TableCell>Property Name</TableCell>
              <TableCell>Property Value</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {networkProperties.map((row, index) => {
              return (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      sx={{ fontSize: 14 }}
                      size="small"
                      value={row.dataType}
                      label="Data type"
                      onChange={(e) => {
                        updateNetworkPropertyType(
                          index,
                          e.target.value as ValueTypeName,
                        )
                      }}
                    >
                      {Object.values(ValueTypeName).map((vtn) => {
                        return (
                          <MenuItem key={vtn} value={vtn}>
                            {vtn}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      sx={{ fontSize: 14 }}
                      disableUnderline
                      size="small"
                      onChange={(e) => {
                        updateNetworkPropertyName(index, e.target.value)
                      }}
                      value={row.predicateString}
                    ></Input>
                  </TableCell>
                  <TableCell>
                    <ValueForm
                      dataType={row.dataType}
                      value={row.value}
                      onValueChange={(value) => {
                        updateNetworkPropertyValue(index, value)
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => deleteNetworkProperty(index)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Button
        sx={{ mt: 1 }}
        variant="contained"
        onClick={() => addNetworkProperty()}
      >
        Add new property
      </Button>
    </Paper>
  )
}

export default NdexNetworkPropertyTable
