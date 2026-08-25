import { Box, Button, TextField, Typography } from '@mui/material'
import React from 'react'

export function StringInput(props: {
  currentValue: string | null
  onValueChange: (value: string) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { currentValue } = props

  const [localValue, setLocalValue] = React.useState(currentValue ?? '')

  React.useEffect(() => {
    setLocalValue(currentValue ?? '')
  }, [currentValue])

  return (
    <Box>
      <TextField
        data-testid="string-input-textfield"
        value={localValue ?? ''}
        type="string"
        onChange={(e) => setLocalValue(e.target.value)}
        sx={{ width: '100%', p: 0.25 }}
      >
        {localValue}
      </TextField>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          p: 0.25,
        }}
      >
        <Button
          data-testid="string-input-cancel-button"
          variant="outlined"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? '')
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="string-input-confirm-button"
          variant="contained"
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
