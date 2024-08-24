import { VisibilityType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
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
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

  return (
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
            color: currentValue === visibility ? 'blue' : 'black',
            fontWeight: currentValue === visibility ? 'bold' : 'normal',
            width: 100,
            p: 1,
            '&:hover': { cursor: 'pointer' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          onClick={() => onValueChange(visibility)}
          key={visibility}
        >
          <Visibility
            value={visibility}
            isSelected={currentValue === visibility}
          />
          <Box>{visibility}</Box>
        </Box>
      ))}
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
