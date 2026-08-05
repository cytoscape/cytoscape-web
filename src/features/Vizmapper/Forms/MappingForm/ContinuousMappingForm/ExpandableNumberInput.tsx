import {
  Box,
  Button,
  ButtonBase,
  InputAdornment,
  Popover,
  TextField,
} from '@mui/material'
import React from 'react'


// A button that displays a number input value, the user can click this button to open up a dropdown form that allows the user to input a number and cancel/confirm
//
// CW-591: `displayMultiplier`/`suffix`/`displayDecimals` let a caller show the
// value in a different unit than it is stored in (e.g. opacity is stored as
// 0-1 but shown/edited as 0-100%). The value/onConfirm/min/max props always use
// the underlying (stored) unit; only the display and the in-popover editor are
// scaled.
export function ExpandableNumberInput(props: {
  value: number
  onConfirm: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  displayMultiplier?: number
  suffix?: string
  displayDecimals?: number
}): React.ReactElement {
  const { value, onConfirm } = props
  const displayMultiplier = props.displayMultiplier ?? 1
  const suffix = props.suffix ?? ''
  const displayDecimals = props.displayDecimals ?? 2
  const toDisplay = (v: number): number => v * displayMultiplier
  const fromDisplay = (v: number): number => v / displayMultiplier
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

  const errorMsg = (value: number): string | null => {
    if (!isValid(value)) {
      if (props.min != null && props.max != null) {
        return `Value must be between ${props.min} and ${props.max}`
      }
      if (props.min != null) {
        return `Value must be greater than ${props.min}`
      }
      if (props.max != null) {
        return `Value must be less than ${props.max}`
      }
    }

    return null
  }

  return (
    <>
      <ButtonBase
        disabled={props.disabled}
        onClick={(e) => showPopover(e)}
        sx={{
          fontSize: '0.875rem',
          textAlign: 'right',
        }}
      >
        <Box
          sx={{
            width: 45,
            height: 25,
            zIndex: 4,
            '&:hover': {
              pointer: 'cursor',
            },
            overflow: 'hidden',
            border: (theme) => props.disabled ? 'none' : `1px solid ${theme.palette.divider}`,
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {`${toDisplay(value).toFixed(displayDecimals)}${suffix}`}
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
        <TextField
          type="number"
          size="small"
          error={errorMsg(localValue) !== null}
          helperText={errorMsg(localValue)}
          value={toDisplay(localValue)}
          inputProps={{
            min: props.min != null ? toDisplay(props.min) : undefined,
            max: props.max != null ? toDisplay(props.max) : undefined,
          }}
          InputProps={
            suffix !== ''
              ? {
                  endAdornment: (
                    <InputAdornment position="end">{suffix}</InputAdornment>
                  ),
                }
              : undefined
          }
          onChange={(e) => {
            const parsed = Number.parseFloat(e.target.value)
            setLocalValue(Number.isNaN(parsed) ? 0 : fromDisplay(parsed))
          }}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          <Button
            variant="text"
            onClick={handleCancel}
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: (theme) => theme.spacing(0, 0, 0, 0.5),
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!isValid(localValue)}
            onClick={handleConfirm}
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: (theme) => theme.spacing(0, 0, 0.5, 0),
            }}
          >
            Confirm
          </Button>
        </Box>
      </Popover>
    </>
  )
}
