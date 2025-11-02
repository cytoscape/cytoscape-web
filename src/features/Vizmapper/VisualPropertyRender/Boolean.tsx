import { Box, Button, Switch } from '@mui/material'
import React from 'react'
import { CancelConfirmButtonGroup } from './CancelConfirmButtonGroup'

export function BooleanSwitch(props: {
  currentValue: boolean | null
  onValueChange: (value: boolean) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const [localValue, setLocalValue] = React.useState(currentValue ?? false)

  React.useEffect(() => {
    setLocalValue(currentValue ?? false)
  }, [currentValue])
  return (
    <Box>
      <Switch
        checked={localValue ?? false}
        onChange={(e) => setLocalValue(e.target.checked)}
      ></Switch>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="primary"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? false)
          }}
        >
          Cancel
        </Button>
        <Button
          sx={{
            color: '#FFFFFF',
            backgroundColor: '#337ab7',
            '&:hover': {
              backgroundColor: '#285a9b',
            },
          }}
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

export function Boolean(props: { value: boolean }): React.ReactElement {
  return <Box>{props.value}</Box>
}
