import { FontType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function FontPicker(props: {
  currentValue: FontType | null
  onValueChange: (font: FontType) => void
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const sortedFontTypes = Object.values(FontType).sort();

  return (
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
            color: currentValue === font ? 'blue' : 'black',
            fontWeight: currentValue === font ? 'bold' : 'normal',
            width: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            '&:hover': { cursor: 'pointer' },
            fontFamily: font,
          }}
          onClick={() => onValueChange(font)}
          key={font}
        >
          <Font value={font} isSelected={currentValue === font} />
          {font}
        </Box>
      ))}
    </Box>
  )
}

export function Font(props: { value: FontType, isSelected: boolean }): React.ReactElement {
  const { value, isSelected } = props
  return <Box sx={{ fontFamily: value, transform: isSelected ? 'scale(1.1)' : 'none' }}>Aa</Box>
}
