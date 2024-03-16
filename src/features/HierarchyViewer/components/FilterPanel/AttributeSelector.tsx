import {
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material'
import { Column, Table } from '../../../../models/TableModel'
import { useEffect, useState } from 'react'
import { GraphObjectType } from '../../../../models/NetworkModel'
import { set } from 'lodash'

interface AttributeSelectorProps {
  nodeTable: Table
  edgeTable: Table
  defaultValue: string
  selectedType: GraphObjectType
  setSelectedValue: (value: string) => void
  setSelectedType: (value: GraphObjectType) => void
}

const Dropdown = ({
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
    <div>
      <RadioGroup row value={selectedType} onChange={handleTypeChange}>
        <FormControlLabel
          value={GraphObjectType.NODE}
          control={<Radio />}
          label={GraphObjectType.NODE}
        />
        <FormControlLabel
          value={GraphObjectType.EDGE}
          control={<Radio />}
          label={GraphObjectType.EDGE}
        />
      </RadioGroup>
      <Select value={defaultValue || options[0]} onChange={handleChange}>
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </div>
  )
}

export default Dropdown
