import { MantineProvider, NumberInput } from '@mantine/core'
import { ButtonBase, Box, Popover, Button } from '@mui/material'
import React from 'react'

// A button that displays a number input value, the user can click this button to open up a dropdown form that allows the user to input a number and cancel/confirm
export function ExpandableNumberInput(props: {
  value: number
  onConfirm: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
}): React.ReactElement {
  const { value, onConfirm } = props
  const [localValue, setLocalValue] = React.useState<number>(value as number)
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    setLocalValue(value as number)
  }, [value])

  const handleCancel = () => {
    setLocalValue(value as number)
    hidePopover()
  }

  const handleConfirm = () => {
    onConfirm(localValue)
    hidePopover()
  }

  const showPopover = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const hidePopover = (): void => {
    setAnchorEl(null)
  }

  const isValid = (value: number): boolean => {
    if (props.min != null && value < props.min) {
      return false
    }
    if (props.max != null && value > props.max) {
      return false
    }
    return true
  }

  return (
    <MantineProvider>
      <ButtonBase disabled={props.disabled} onClick={(e) => showPopover(e)}>
        <Box
          sx={{
            width: 45,
            height: 25,
            zIndex: 4,

            '&:hover': {
              pointer: 'cursor',
            },
            overflow: 'hidden',
            border: props.disabled ? 'none' : '1px solid #d6d6d6',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {value.toFixed(2)}
        </Box>
      </ButtonBase>

      <Popover
        open={anchorEl != null}
        anchorEl={anchorEl}
        onClose={hidePopover}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <NumberInput
          error={
            !isValid(localValue)
              ? `Value must be between ${props.min} and ${props.max}`
              : null
          }
          min={props.min}
          max={props.max}
          value={localValue as number}
          // decimalScale={2}
          onChange={(newValue) => {
            if (typeof newValue === 'string') {
              setLocalValue(0)
            } else {
              setLocalValue(newValue)
            }
          }}
        />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button color="error" onClick={handleCancel}>
            Cancel
          </Button>
          <Button disabled={!isValid(localValue)} onClick={handleConfirm}>
            Confirm
          </Button>
        </Box>
      </Popover>
    </MantineProvider>
  )
}
