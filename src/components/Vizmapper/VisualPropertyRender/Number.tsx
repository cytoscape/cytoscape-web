import { Box, TextField, Typography } from '@mui/material'

export function NumberInput(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  return (
    <Box>
      <TextField
        value={currentValue ?? 0}
        type="number"
        onChange={(e) => onValueChange(+e.target.value)}
      >
        <Typography variant="h6">{currentValue}</Typography>
      </TextField>
    </Box>
  )
}

export function Number(props: { value: number }): React.ReactElement {
  return (
    <Box>
      <Typography variant="body1">{props.value}</Typography>
    </Box>
  )
}
