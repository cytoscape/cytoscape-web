import { Box, TextField, Typography, Button, FormControlLabel, Checkbox } from '@mui/material'
import { useState, useEffect, ChangeEvent } from 'react'
import { useLockNodeSizeStore } from '../../../store/LockNodeSizeStore'
import { serializedStringIsValid } from '../../../models/TableModel/impl/ValueTypeImpl'
import { ValueTypeName } from '../../../models/TableModel'
import { VisualPropertyName, NodeVisualPropertyNames } from '../../../models/VisualStyleModel/VisualPropertyName'

export function NumberInput(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
  closePopover: () => void
  vpName?: VisualPropertyName
}): React.ReactElement {
  const { onValueChange, currentValue, vpName, closePopover } = props
  const isSize = vpName === NodeVisualPropertyNames.nodeHeight || vpName === NodeVisualPropertyNames.nodeWidth
  const isHeight = vpName === NodeVisualPropertyNames.nodeHeight
  const [value, setValue] = useState(String(currentValue ?? 0))
  const strValueIsValid = (value: string): boolean => {
    return serializedStringIsValid(ValueTypeName.Integer, value) || serializedStringIsValid(ValueTypeName.Double, value) || serializedStringIsValid(ValueTypeName.Long, value)

  }
  const [isValid, setValueIsValid] = useState(strValueIsValid(value))
  const setLockNodeSize = useLockNodeSizeStore(store => store.setLockState)
  const setSize = useLockNodeSizeStore(store => store.setSize)
  const isHeightLocked = useLockNodeSizeStore(store => store.isHeightLocked)
  const isWidthLocked = useLockNodeSizeStore(store => store.isWidthLocked)
  const size = useLockNodeSizeStore(store => store.size)
  const [isChecked, setIsChecked] = useState(isHeight ? isHeightLocked : isWidthLocked)

  useEffect(() => {
    setValue(String(currentValue ?? 0))
  }, [currentValue])

  useEffect(() => {
    if (isSize && (isHeight ? isHeightLocked : isWidthLocked)) {
      setValue(String(size))
      const nextValue = Number(Number(size).toFixed(4))
      if (!isNaN(nextValue)) {
        onValueChange(nextValue)
      }
    }
  }, [size])

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setIsChecked(!isChecked)
    setLockNodeSize(!isChecked, currentValue ?? 0, isHeight)
  }


  return (
    <Box
      // make inside components align vertically
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TextField
        value={value}
        error={!isValid}
        disabled={isSize ? (isHeight ? isHeightLocked : isWidthLocked) : false}
        onChange={(e) => {
          setValue(e.target.value)
          setValueIsValid(strValueIsValid(e.target.value))
        }}
      >
        <Typography variant="h6">{value}</Typography>
      </TextField>
      {isSize && <FormControlLabel
        disabled={isValid && isHeight ? isHeightLocked : isWidthLocked}
        control={<Checkbox
          checked={isChecked}
          onChange={handleToggle}
          name="lockNodeSize"
          color="primary"
        />}
        label='Lock node width and height'
      />}
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
            }
            if (isSize && isChecked) {
              setSize(nextValue)
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
