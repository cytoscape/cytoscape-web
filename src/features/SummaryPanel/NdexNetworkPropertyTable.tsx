import Delete from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  IconButton,
  Input,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import React from 'react'

import { NetworkProperty } from '../../models/NetworkSummaryModel'
import { ValueType,ValueTypeName } from '../../models/TableModel'
import { serializedStringIsValid } from '../../models/TableModel/impl/valueTypeImpl'

interface NetworkPropertyState extends NetworkProperty {
  valueIsValid: boolean
}

const NetworkPropertyTable = (props: {
  networkProperties: NetworkProperty[]
  setNetworkProperties: (properties: NetworkProperty[]) => void
}): React.ReactElement => {
  const { networkProperties, setNetworkProperties } = props

  const [localNetworkProperties, setLocalNetworkProperties] = React.useState<
    NetworkPropertyState[]
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const defaultNewProperty: NetworkPropertyState = {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ valueIsValid, ...ndexNetworkProperty }) => ndexNetworkProperty,
      ),
    )
  }

  return (
    <Paper
      data-testid="ndex-network-property-table"
      sx={{ backgroundColor: '#D9D9D9', p: 1, pr: 2, pl: 2 }}
    >
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
                      data-testid={`ndex-network-property-type-select-${index}`}
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
                      data-testid={`ndex-network-property-name-input-${index}`}
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
                        data-testid={`ndex-network-property-value-input-${index}`}
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
                    <IconButton
                      data-testid={`ndex-network-property-delete-button-${index}`}
                      onClick={() => deleteNetworkProperty(index)}
                    >
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
        data-testid="ndex-network-property-add-button"
        sx={{ mt: 1, width: 'fit-content' }}
        variant="contained"
        onClick={() => addNetworkProperty()}
      >
        Add new property
      </Button>
    </Paper>
  )
}

export default NetworkPropertyTable
