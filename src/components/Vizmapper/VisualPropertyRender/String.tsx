import { Box, TextField, Typography } from '@mui/material'

export function StringInput(props: {
  currentValue: string | null
  onValueChange: (value: string) => void
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  return (
    <Box>
      <TextField
        value={currentValue ?? ''}
        type="string"
        onChange={(e) => onValueChange(e.target.value)}
      >
        {currentValue}
      </TextField>
    </Box>
  )
}

export function String(props: { value: string }): React.ReactElement {
  return <Typography variant="body1">{props.value}</Typography>
}
