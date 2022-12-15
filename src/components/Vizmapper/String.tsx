import { Box, TextField } from '@mui/material'

export function StringInput(props: {
  currentValue: string
  onValueChange: (value: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  return (
    <Box>
      <TextField
        value={currentValue}
        type="string"
        onChange={(e) => onValueChange(e.target.value)}
      >
        {currentValue}
      </TextField>
    </Box>
  )
}

export function String(props: { value: string }): React.ReactElement {
  return <Box>{props.value}</Box>
}
