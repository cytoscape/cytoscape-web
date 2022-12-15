import { EdgeArrowShapeType } from '../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function EdgeArrowShapePicker(props: {
  currentValue: EdgeArrowShapeType
  onValueChange: (edgeArrowShape: EdgeArrowShapeType) => void
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
      {Object.values(EdgeArrowShapeType).map(
        (edgeArrowShape: EdgeArrowShapeType) => (
          <Box
            sx={{
              color: currentValue === edgeArrowShape ? 'blue' : 'black',
              width: 100,
              p: 1,
              '&:hover': { cursor: 'pointer' },
            }}
            onClick={() => onValueChange(edgeArrowShape)}
            key={edgeArrowShape}
          >
            {edgeArrowShape}
          </Box>
        ),
      )}
    </Box>
  )
}

export function EdgeArrowShape(props: {
  edgeArrowShape: EdgeArrowShapeType
}): React.ReactElement {
  return <Box>{props.edgeArrowShape}</Box>
}
