import { Box, TextField, Typography, Button } from '@mui/material'
import * as React from 'react'
export function NumberInput(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const [value, setValue] = React.useState(String(currentValue ?? 0))

  React.useEffect(() => {
    setValue(String(currentValue ?? 0))
  }, [currentValue])

  return (
    <Box>
      <TextField
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
        value={Number(value).toFixed(0)}
        type="number"
        onChange={(e) => {
          const newValue = Number(Number(e.target.value).toFixed(4))
          setValue(String(newValue))
        }}
      >
        <Typography variant="h6">{currentValue}</Typography>
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
      <Typography variant="body1">{displayValue}</Typography>
    </Box>
  )
}
