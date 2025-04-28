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
  Box,
} from '@mui/material'

import Delete from '@mui/icons-material/Delete'
import { ValueTypeName, ValueType } from '../../models/TableModel'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { serializedStringIsValid } from '../../models/TableModel/impl/ValueTypeImpl'
import { NdexNetworkProperty } from '../../models/NetworkSummaryModel'

interface NdexNetworkPropertyState extends NdexNetworkProperty {
  valueIsValid: boolean
}

const NdexNetworkPropertyTable = (props: {
  networkProperties: NdexNetworkProperty[]
  setNetworkProperties: (properties: NdexNetworkProperty[]) => void
}): React.ReactElement => {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const { networkProperties, setNetworkProperties } = props

  const [localNetworkProperties, setLocalNetworkProperties] = React.useState<
    NdexNetworkPropertyState[]
  >(networkProperties.map((p) => ({ ...p, valueIsValid: true })))

  React.useEffect(() => {
    setLocalNetworkProperties(
      networkProperties.map((p) => ({ ...p, valueIsValid: true })),
    )
  }, [networkProperties])

  const updateNetworkPropertyType = (
    index: number,
    dataType: ValueTypeName,
  ): void => {
    const nextProperties = [...localNetworkProperties]
    //  the form treats all values as strings and the ndex server currently expects these values to be strings (June 2, 2023)
    const defaultvalue = ''
    const nextProperty = Object.assign({}, nextProperties[index], {
      dataType,
      value: defaultvalue,
    })
    nextProperties[index] = nextProperty

    setLocalNetworkProperties(nextProperties)
    setNetworkProperties(
      nextProperties.map(
        ({ valueIsValid, ...ndexNetworkProperty }) => ndexNetworkProperty,
      ),
    )
  }

  const updateNetworkPropertyName = (index: number, name: string): void => {
    const nextProperties = [...localNetworkProperties]
    const nextProperty = Object.assign({}, nextProperties[index], {
      predicateString: name,
    })

    nextProperties[index] = nextProperty
    setLocalNetworkProperties(nextProperties)
    setNetworkProperties(
      nextProperties.map(
        ({ valueIsValid, ...ndexNetworkProperty }) => ndexNetworkProperty,
      ),
    )
  }

  const updateNetworkPropertyValue = (
    index: number,
    value: ValueType,
  ): void => {
    const nextProperties = [...localNetworkProperties]

    const nextValueIsValid = serializedStringIsValid(
      nextProperties[index].dataType,
      value as string,
    )

    // always update local state, but validate before updating global store state

    const nextProperty = Object.assign({}, nextProperties[index], {
      value,
      valueIsValid: nextValueIsValid,
    })

    nextProperties[index] = nextProperty

    setLocalNetworkProperties(nextProperties)

    if (nextValueIsValid) {
      setNetworkProperties(
        nextProperties.map(
          ({ valueIsValid, ...ndexNetworkProperty }) => ndexNetworkProperty,
        ),
      )
    }
  }

  const addNetworkProperty = (): void => {
    const existingPropertyNames = new Set(
      localNetworkProperties.map((p) => p.predicateString),
    )
    const newPropertyName = (counter: number): string =>
      `new property ${counter}`

    let newPropertyCounter = 0
    while (existingPropertyNames.has(newPropertyName(newPropertyCounter))) {
      newPropertyCounter++
    }
    const defaultNewProperty: NdexNetworkPropertyState = {
      subNetworkId: null,
      predicateString: newPropertyName(newPropertyCounter),
      dataType: ValueTypeName.String,
      value: '',
      valueIsValid: true,
    }

    const nextProperties = [...localNetworkProperties, defaultNewProperty]

    setLocalNetworkProperties(nextProperties)
    setNetworkProperties(
      nextProperties.map(
        ({ valueIsValid, ...ndexNetworkProperty }) => ndexNetworkProperty,
      ),
    )
  }

  const deleteNetworkProperty = (index: number): void => {
    const nextProperties = [...localNetworkProperties]
    nextProperties.splice(index, 1)

    setLocalNetworkProperties(nextProperties)

    setNetworkProperties(
      nextProperties.map(
        ({ valueIsValid, ...ndexNetworkProperty }) => ndexNetworkProperty,
      ),
    )
  }

  return (
    <Paper sx={{ backgroundColor: '#D9D9D9', p: 1, pr: 2, pl: 2 }}>
      <Typography gutterBottom>Network Properties</Typography>
      <TableContainer
        sx={{ height: 300, overflowY: 'scroll' }}
        component={Paper}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data Type</TableCell>
              <TableCell>Property Name</TableCell>
              <TableCell>Property Value</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localNetworkProperties.map((row, index) => {
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
                      size="small"
                      onChange={(e) => {
                        updateNetworkPropertyName(index, e.target.value)
                      }}
                      value={row.predicateString}
                    ></Input>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Input
                        type="text"
                        sx={{ fontSize: 14 }}
                        error={!row.valueIsValid}
                        size="small"
                        onChange={(e) => {
                          updateNetworkPropertyValue(index, e.target.value)
                        }}
                        value={`${row.value as string}`}
                      />
                    </Box>
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
