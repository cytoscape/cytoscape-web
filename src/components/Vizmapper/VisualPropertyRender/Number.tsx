import { Box, TextField, Typography, Button, FormControlLabel, Checkbox } from '@mui/material'
import { useState, useEffect, ChangeEvent } from 'react'
import { useLockNodeSizeStore, LockedDimension } from '../../../store/LockNodeSizeStore'
import { serializedStringIsValid } from '../../../models/TableModel/impl/ValueTypeImpl'
import { ValueTypeName } from '../../../models/TableModel'
import { VisualPropertyName, NodeVisualPropertyNames } from '../../../models/VisualStyleModel/VisualPropertyName'
import { LockSizeCheckbox } from './Checkbox'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'

export function NumberInput(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
  closePopover: () => void
  vpName: VisualPropertyName
  syncValue: (value: number) => void
}): React.ReactElement {
  const { onValueChange, currentValue, vpName, closePopover, syncValue } = props
  const isSize = vpName === NodeVisualPropertyNames.nodeHeight || vpName === NodeVisualPropertyNames.nodeWidth
  const isHeight = vpName === NodeVisualPropertyNames.nodeHeight
  const [value, setValue] = useState(String(currentValue ?? 0))
  const strValueIsValid = (value: string): boolean => {
    return serializedStringIsValid(ValueTypeName.Integer, value) || serializedStringIsValid(ValueTypeName.Double, value) || serializedStringIsValid(ValueTypeName.Long, value)

  }
  const [isValid, setValueIsValid] = useState(strValueIsValid(value))
  const isChecked = useLockNodeSizeStore(state => state.isLocked);

  useEffect(() => {
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
      {isSize && <LockSizeCheckbox isHeight={isHeight} syncValue={syncValue} size={Number(currentValue)} />}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button
          color="error"
          onClick={() => {
            setValue(String(currentValue ?? 0));
            setValueIsValid(strValueIsValid(String(currentValue ?? 0)));
            closePopover();
          }}
        >
          Cancel
        </Button>
        <Button
          disabled={!isValid}
          onClick={() => {
            const nextValue = Number(Number(value).toFixed(4))
            if (!isNaN(nextValue)) {
              onValueChange(nextValue)
              if (isSize && isChecked) {
                syncValue(nextValue)
              }
            }
            closePopover();
          }}
        >
          Confirm
        </Button>
      </Box>
    </Box >
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
