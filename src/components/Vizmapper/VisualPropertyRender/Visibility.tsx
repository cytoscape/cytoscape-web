import { VisibilityType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Button } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import React from 'react'
const visibilityMap: Record<
  VisibilityType,
  (isSelected: boolean) => React.ReactElement
> = {
  [VisibilityType.Element]: (isSelected: boolean) => (
    <VisibilityIcon
      sx={{
        p: 0,
        m: 0,
        transform: isSelected ? 'scale(1.1)' : 'none',
      }}
    />
  ),
  [VisibilityType.None]: (isSelected: boolean) => (
    <VisibilityOffIcon
      sx={{
        p: 0,
        m: 0,
        transform: isSelected ? 'scale(1.1)' : 'none',
      }}
    />
  ),
}

export function VisibilityPicker(props: {
  currentValue: VisibilityType | null
  onValueChange: (visibility: VisibilityType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const [localValue, setLocalValue] = React.useState(
    currentValue ?? VisibilityType.Element,
  )

  React.useEffect(() => {
    setLocalValue(currentValue ?? VisibilityType.Element)
  }, [currentValue])

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        {Object.values(VisibilityType).map((visibility: VisibilityType) => (
          <Box
            sx={{
              color: localValue === visibility ? 'blue' : 'black',
              fontWeight: localValue === visibility ? 'bold' : 'normal',
              width: 100,
              p: 1,
              '&:hover': { cursor: 'pointer' },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onClick={() => setLocalValue(visibility)}
            key={visibility}
          >
            <Visibility
              value={visibility}
              isSelected={localValue === visibility}
            />
            <Box>{visibility}</Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="error"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? VisibilityType.Element)
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

export function Visibility(props: {
  value: VisibilityType
  isSelected: boolean
}): React.ReactElement {
  const { value, isSelected } = props
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {visibilityMap[value]?.(isSelected)}
    </Box>
  )
}
