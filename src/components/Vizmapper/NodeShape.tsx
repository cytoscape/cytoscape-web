import { NodeShapeType } from '../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function NodeShapePicker(props: {
  currentValue: NodeShapeType
  onClick: (shape: NodeShapeType) => void
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
      {Object.values(NodeShapeType).map((shape: NodeShapeType) => (
        <Box
          sx={{
            color: currentValue === shape ? 'blue' : 'black',
            width: 100,
            p: 1,
            '&:hover': { cursor: 'pointer' },
          }}
          onClick={() => onClick(shape)}
          key={shape}
        >
          {shape}
        </Box>
      ))}
    </Box>
  )
}

export function NodeShape(props: { shape: NodeShapeType }): React.ReactElement {
  return <Box>{props.shape}</Box>
}
