import { NodeShapeType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import {
  EllipseIcon,
  RectangleIcon,
  RoundRectangleIcon,
  TriangleIcon,
  DiamondIcon,
  OctagonIcon,
  HexagonIcon,
  ParallelogramIcon,
  VeeIcon,
} from '../VisualStyleIcons'
import React from 'react'

const nodeShapeMap: Record<NodeShapeType, React.ReactElement> = {
  [NodeShapeType.Ellipse]: <EllipseIcon />,
  [NodeShapeType.Rectangle]: <RectangleIcon />,
  [NodeShapeType.RoundRectangle]: <RoundRectangleIcon />,
  [NodeShapeType.Triangle]: <TriangleIcon />,
  [NodeShapeType.Diamond]: <DiamondIcon />,
  [NodeShapeType.Hexagon]: <HexagonIcon />,
  [NodeShapeType.Octagon]: <OctagonIcon />,
  [NodeShapeType.Parallelogram]: <ParallelogramIcon />,
  [NodeShapeType.Vee]: <VeeIcon />,
}

const nodeShapeDisplayNameMap: Record<NodeShapeType, string> = {
  [NodeShapeType.Ellipse]: 'ellipse',
  [NodeShapeType.Rectangle]: 'rectangle',
  [NodeShapeType.RoundRectangle]: 'round-rectangle',
  [NodeShapeType.Triangle]: 'triangle',
  [NodeShapeType.Diamond]: 'diamond',
  [NodeShapeType.Hexagon]: 'hexagon',
  [NodeShapeType.Octagon]: 'octagon',
  [NodeShapeType.Parallelogram]: 'parallelogram',
  [NodeShapeType.Vee]: 'vee',
}

export function NodeShapePicker(props: {
  currentValue: NodeShapeType | null
  onValueChange: (shape: NodeShapeType) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        width: 300,
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
          onClick={() => onValueChange(shape)}
          key={shape}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 100,
            }}
          >
            <NodeShape value={shape} />
            <Box>{nodeShapeDisplayNameMap[shape]}</Box>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export function NodeShape(props: { value: NodeShapeType }): React.ReactElement {
  return nodeShapeMap[props.value] ?? <Box>{props.value}</Box>
}
