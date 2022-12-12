import { VisibilityType } from '../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function VisibilityPicker(props: {
  currentValue: VisibilityType
  onClick: (visibility: VisibilityType) => void
}): React.ReactElement {
  const { onClick, currentValue } = props

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
          }}
          onClick={() => onClick(visibility)}
          key={visibility}
        >
          {visibility}
        </Box>
      ))}
    </Box>
  )
}

export function Visibility(props: {
  visibility: VisibilityType
}): React.ReactElement {
  return <Box>{props.visibility}</Box>
}
