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
import { Column, Table } from '../../../../models/TableModel'
import { useEffect } from 'react'
import { GraphObjectType } from '../../../../models/NetworkModel'

interface AttributeSelectorProps {
  enableFilter: boolean
  nodeTable: Table
  edgeTable: Table
  defaultValue: string
  selectedType: GraphObjectType
  setSelectedValue: (value: string) => void
  setSelectedType: (value: GraphObjectType) => void
}

export const AttributeSelector = ({
  enableFilter,
  nodeTable,
  edgeTable,
  defaultValue,
  selectedType,
  setSelectedValue,
  setSelectedType,
}: AttributeSelectorProps) => {
  const targetTable =
    selectedType === GraphObjectType.NODE ? nodeTable : edgeTable
  const options: string[] = targetTable.columns.map(
    (column: Column) => column.name,
  )

  useEffect(() => {
    const selected: string = defaultValue === '' ? options[0] : defaultValue
    setSelectedValue(selected)
  }, [options, defaultValue])

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
          disabled={!enableFilter}
          value={defaultValue || options[0]}
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
