import AddIcon from '@mui/icons-material/Add'
import Delete from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Box,
  Button,
  IconButton,
  Input,
  InputAdornment,
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
import { ValueTypeNameChip } from '../../components/ValueTypeNameChip'
import {
  orderedValueTypeNames,
} from '../../models/TableModel/impl/valueTypeNameDisplay'
import {
  deserializeValue,
  isListType,
  serializedStringIsValid,
  serializeValue,
} from '../../models/TableModel/impl/valueTypeImpl'
import { ListValueEditorDialog } from '../TableBrowser/ListValueEditorDialog'

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

  // Index of the row whose list value is being edited in the shared dialog
  // (CW-563); null when the dialog is closed.
  const [listEditorIndex, setListEditorIndex] = React.useState<number | null>(
    null,
  )

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
      variant="filled"
      data-testid="ndex-network-property-table"
      sx={{ 
        mt: 2,
        px: 2,
        py: 1,
        backgroundColor: (theme) => theme.palette.background.subtle,
      }}
    >
      <Typography gutterBottom>Network Properties:</Typography>
      <TableContainer
        sx={{
          height: 300,
          overflowY: 'scroll',
          border: (theme) => `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }}
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
                      {orderedValueTypeNames.map((vtn) => {
                        return (
                          <MenuItem key={vtn} value={vtn}>
                            <ValueTypeNameChip type={vtn} variant="chip-and-text" showTooltip={false} />
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
                      {isListType(row.dataType) ? (
                        <Input
                          data-testid={`ndex-network-property-value-input-${index}`}
                          type="text"
                          readOnly
                          sx={{ fontSize: 14, cursor: 'pointer' }}
                          error={!row.valueIsValid}
                          size="small"
                          placeholder="Click to edit list…"
                          onClick={() => setListEditorIndex(index)}
                          value={`${row.value as string}`}
                          endAdornment={
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                aria-label={`edit list ${row.predicateString}`}
                                onClick={() => setListEditorIndex(index)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          }
                        />
                      ) : (
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
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      data-testid={`ndex-network-property-delete-button-${index}`}
                      onClick={() => deleteNetworkProperty(index)}
                    >
                      <Delete sx={{ color: (theme) => theme.palette.text.primary }} />
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
        startIcon={<AddIcon />}
        onClick={() => addNetworkProperty()}
      >
        Add new property
      </Button>
      {listEditorIndex !== null ? (
        <ListValueEditorDialog
          open
          columnName={
            localNetworkProperties[listEditorIndex].predicateString || 'value'
          }
          listType={localNetworkProperties[listEditorIndex].dataType}
          value={
            `${localNetworkProperties[listEditorIndex].value as string}`.length >
            0
              ? deserializeValue(
                  localNetworkProperties[listEditorIndex].dataType,
                  `${localNetworkProperties[listEditorIndex].value as string}`,
                )
              : []
          }
          onCancel={() => setListEditorIndex(null)}
          onSave={(v) => {
            // NDEx stores property values as serialized strings, so we
            // re-serialize the edited list before committing (CW-563).
            updateNetworkPropertyValue(listEditorIndex, serializeValue(v))
            setListEditorIndex(null)
          }}
        />
      ) : null}
    </Paper>
  )
}

export default NetworkPropertyTable
