import { Box, TextField, Typography, Button } from '@mui/material'
import * as React from 'react'
import { serializedStringIsValid } from '../../../models/TableModel/impl/ValueTypeImpl'
import { ValueTypeName } from '../../../models/TableModel'
export function NumberInput(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const [value, setValue] = React.useState(String(currentValue ?? 0))
  const strValueIsValid = (value: string): boolean => {
    return serializedStringIsValid(ValueTypeName.Integer, value) || serializedStringIsValid(ValueTypeName.Double, value) || serializedStringIsValid(ValueTypeName.Long, value)

  }
  const [isValid, setValueIsValid] = React.useState(strValueIsValid(value))

  React.useEffect(() => {
    setValue(String(currentValue ?? 0))
  }, [currentValue])

  return (
    <Box>
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button
          color="error"
          onClick={() => setValue(String(currentValue ?? 0))}
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
