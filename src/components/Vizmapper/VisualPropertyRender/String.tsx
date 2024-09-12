import { Box, Button, TextField, Typography } from '@mui/material'
import React from 'react'

export function StringInput(props: {
  currentValue: string | null
  onValueChange: (value: string) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

  const [localValue, setLocalValue] = React.useState(currentValue ?? '')

  React.useEffect(() => {
    setLocalValue(currentValue ?? '')
  }, [currentValue])

  return (
    <Box>
      <TextField
        value={localValue ?? ''}
        type="string"
        onChange={(e) => setLocalValue(e.target.value)}
      >
        {localValue}
      </TextField>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="error"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? '')
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            props.onValueChange(localValue)
            props.closePopover('confirm')
          }}
        >
          Confirm
        </Button>
      </Box>
    </Box>
  )
}

export function String(props: { value: string }): React.ReactElement {
  return <Typography variant="body1">{props.value}</Typography>
}
