import { VisibilityType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
const visibilityMap: Record<VisibilityType, React.ReactElement> = {
  element: (
    <VisibilityIcon
      sx={{
        p: 0,
        m: 0,
      }}
    />
  ),
  none: (
    <VisibilityOffIcon
      sx={{
        p: 0,
        m: 0,
      }}
    />
  ),
}

export function VisibilityPicker(props: {
  currentValue: VisibilityType | null
  onValueChange: (visibility: VisibilityType) => void
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
          <Visibility value={visibility} />
          <Box>{visibility}</Box>
        </Box>
      ))}
    </Box>
  )
}

export function Visibility(props: {
  value: VisibilityType
}): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {visibilityMap[props.value]}
    </Box>
  )
}
