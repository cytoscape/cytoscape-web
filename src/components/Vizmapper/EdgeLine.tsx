import { EdgeLineType } from '../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function EdgeLinePicker(props: {
  currentValue: EdgeLineType
  onValueChange: (edgeLine: EdgeLineType) => void
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
      {Object.values(EdgeLineType).map((edgeLine: EdgeLineType) => (
        <Box
          sx={{
            color: currentValue === edgeLine ? 'blue' : 'black',
            width: 100,
            p: 1,
            '&:hover': { cursor: 'pointer' },
          }}
          onClick={() => onValueChange(edgeLine)}
          key={edgeLine}
        >
          {edgeLine}
        </Box>
      ))}
    </Box>
  )
}

export function EdgeLine(props: {
  edgeLine: EdgeLineType
}): React.ReactElement {
  return <Box>{props.edgeLine}</Box>
}
