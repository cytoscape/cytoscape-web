import {
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Container,
  Box,
} from '@mui/material'
import { Column, Table, ValueTypeName } from '../../../../models/TableModel'
import { useEffect, useState } from 'react'
import { GraphObjectType } from '../../../../models/NetworkModel'

interface AttributeSelectorProps {
  enableFilter: boolean
  nodeTable: Table
  edgeTable: Table
  selectedValue: string
  selectedType: GraphObjectType
  setSelectedValue: (value: string) => void
  setSelectedType: (value: GraphObjectType) => void
}

export const AttributeSelector = ({
  enableFilter,
  nodeTable,
  edgeTable,
  selectedValue,
  selectedType,
  setSelectedValue,
  setSelectedType,
}: AttributeSelectorProps) => {
  const [enableAttributeNameSelector, setEnableAttributeNameSelector] =
    useState<boolean>(false)

  const targetTable =
    selectedType === GraphObjectType.NODE ? nodeTable : edgeTable

  // Filter options by type. For string
  const options: string[] = []
  targetTable.columns.forEach((column: Column) => {
    const { name, type } = column
    if (type === ValueTypeName.Boolean || type === ValueTypeName.String) {
      options.push(name)
    }
  })

  useEffect(() => {
    if (options.length === 0) {
      setEnableAttributeNameSelector(false)
    } else {
      setEnableAttributeNameSelector(true)
      if (selectedValue === '' || !options.includes(selectedValue)) {
        // Select the first option if the selected value is not in the options
        setSelectedValue(options[0])
      } else {
        setSelectedValue(selectedValue)
      }
    }
  }, [options, selectedValue])

  const handleChange = (event: SelectChangeEvent<string>) => {
    // Update the type of the event parameter
    setSelectedValue(event.target.value)
  }

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedType((event.target as HTMLInputElement).value as GraphObjectType)
  }

  return (
    <Container
      disableGutters={true}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingBottom: '0.5em',
      }}
    >
      <Box sx={{ flex: 1 }}>
        <FormControl
          disabled={!enableFilter}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minWidth: '17em',
          }}
        >
          <FormLabel sx={{ paddingRight: '0.5em' }}>Filter for:</FormLabel>
          <RadioGroup row value={selectedType} onChange={handleTypeChange}>
            <FormControlLabel
              value={GraphObjectType.NODE}
              control={<Radio />}
              label={'Nodes'}
            />
            <FormControlLabel
              value={GraphObjectType.EDGE}
              control={<Radio />}
              label={'Edges'}
            />
          </RadioGroup>
        </FormControl>
      </Box>
      <Box sx={{ width: '100%' }}>
        <Select
          disabled={!enableFilter && !enableAttributeNameSelector}
          value={selectedValue}
          onChange={handleChange}
          size="small"
          sx={{ flexGrow: 1, width: '100%' }}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Container>
  )
}
