import React from 'react'
import { FontType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Button } from '@mui/material'

export function FontPicker(props: {
  currentValue: FontType | null
  onValueChange: (font: FontType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const sortedFontTypes = Object.values(FontType).sort()
  const [localValue, setLocalValue] = React.useState(
    currentValue ?? FontType.SansSerif,
  )

  React.useEffect(() => {
    setLocalValue(currentValue ?? FontType.SansSerif)
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
        {sortedFontTypes.map((font: FontType) => (
          <Box
            sx={{
              color: localValue === font ? 'blue' : 'black',
              fontWeight: localValue === font ? 'bold' : 'normal',
              width: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1,
              '&:hover': { cursor: 'pointer' },
              fontFamily: font,
            }}
            onClick={() => setLocalValue(font)}
            key={font}
          >
            <Font value={font} isSelected={localValue === font} />
            {font}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="error"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? FontType.SansSerif)
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

export function Font(props: {
  value: FontType
  isSelected: boolean
}): React.ReactElement {
  const { value, isSelected } = props
  return (
    <Box
      sx={{ fontFamily: value, transform: isSelected ? 'scale(1.1)' : 'none' }}
    >
      Aa
    </Box>
  )
}
