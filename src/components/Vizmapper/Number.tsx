import { Box, TextField } from '@mui/material'

export function NumberInput(props: {
  currentValue: number
  onValueChange: (value: number) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  return (
    <Box>
      <TextField
        value={currentValue}
        type="number"
        onChange={(e) => onValueChange(+e.target.value)}
      >
        {currentValue}
      </TextField>
    </Box>
  )
}

export function Number(props: { value: number }): React.ReactElement {
  return <Box>{props.value}</Box>
}
