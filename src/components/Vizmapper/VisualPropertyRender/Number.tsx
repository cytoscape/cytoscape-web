import {
  Box,
  TextField,
  Typography,
  Button,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import { useState, useEffect, ChangeEvent } from 'react'
import { serializedStringIsValid } from '../../../models/TableModel/impl/ValueTypeImpl'
import { ValueTypeName } from '../../../models/TableModel'
import {
  VisualPropertyName,
  NodeVisualPropertyName,
} from '../../../models/VisualStyleModel/VisualPropertyName'
import { LockSizeCheckbox } from './Checkbox'
import { IdType } from '../../../models/IdType'
import { getDefaultVisualStyle } from '../../../models/VisualStyleModel/impl/DefaultVisualStyle'

import React from 'react'

export function NumberInput(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
  closePopover: () => void
  currentNetworkId: IdType
  vpName: VisualPropertyName
  showCheckbox?: boolean
}): React.ReactElement {
  const {
    onValueChange,
    currentValue,
    vpName,
    closePopover,
    currentNetworkId,
    showCheckbox,
  } = props
  const isSize =
    vpName === NodeVisualPropertyName.NodeHeight ||
    vpName === NodeVisualPropertyName.NodeWidth
  const [value, setValue] = useState(String(currentValue ?? 0))
  const strValueIsValid = (value: string): boolean => {
    if (
      serializedStringIsValid(ValueTypeName.Integer, value) ||
      serializedStringIsValid(ValueTypeName.Double, value) ||
      serializedStringIsValid(ValueTypeName.Long, value)
    ) {
      const numValue = Number(value)
      const maxVal = getDefaultVisualStyle()[vpName]?.maxVal      
      if (numValue >= 0 && (maxVal === undefined || numValue <= maxVal))
        return true
    }
    return false
  }
  const [isValid, setValueIsValid] = useState(strValueIsValid(value))

  React.useEffect(() => {
    setValue(String(currentValue ?? 0))
  }, [currentValue])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TextField
        value={value}
        error={!isValid}
        onChange={(e) => {
          setValue(e.target.value)
          setValueIsValid(strValueIsValid(e.target.value))
        }}
      >
        <Typography variant="h6">{value}</Typography>
      </TextField>
      {isSize && showCheckbox && (
        <LockSizeCheckbox currentNetworkId={currentNetworkId} />
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button
          color="primary"
          onClick={() => {
            setValue(String(currentValue ?? 0))
            setValueIsValid(strValueIsValid(String(currentValue ?? 0)))
            closePopover()
          }}
        >
          Cancel
        </Button>
        <Button
          sx={{
            color: '#FFFFFF',
            backgroundColor: '#337ab7',
            '&:hover': {
              backgroundColor: '#285a9b',
            },
          }}
          disabled={!isValid}
          onClick={() => {
            const nextValue = Number(Number(value).toFixed(4))
            if (!isNaN(nextValue)) {
              onValueChange(nextValue)
            }
            closePopover()
          }}
        >
          Confirm
        </Button>
      </Box>
    </Box>
  )
}

export function NumberRender(props: { value: number }): React.ReactElement {
  const { value } = props
  let displayValue = value ?? 0

  displayValue =
    displayValue.toFixed != null
      ? Number(displayValue.toFixed(0))
      : displayValue
  return (
    <Box>
      <Typography sx={{ fontSize: 14 }} variant="body1">
        {displayValue}
      </Typography>
    </Box>
  )
}
