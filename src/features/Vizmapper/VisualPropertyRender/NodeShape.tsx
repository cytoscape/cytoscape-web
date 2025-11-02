import { NodeShapeType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Button } from '@mui/material'
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

const nodeShapeMap: Record<
  NodeShapeType,
  (isSelected: boolean) => React.ReactElement
> = {
  [NodeShapeType.Ellipse]: (isSelected: boolean) => (
    <EllipseIcon isSelected={isSelected} />
  ),
  [NodeShapeType.Rectangle]: (isSelected: boolean) => (
    <RectangleIcon isSelected={isSelected} />
  ),
  [NodeShapeType.RoundRectangle]: (isSelected: boolean) => (
    <RoundRectangleIcon isSelected={isSelected} />
  ),
  [NodeShapeType.Triangle]: (isSelected: boolean) => (
    <TriangleIcon isSelected={isSelected} />
  ),
  [NodeShapeType.Diamond]: (isSelected: boolean) => (
    <DiamondIcon isSelected={isSelected} />
  ),
  [NodeShapeType.Hexagon]: (isSelected: boolean) => (
    <HexagonIcon isSelected={isSelected} />
  ),
  [NodeShapeType.Octagon]: (isSelected: boolean) => (
    <OctagonIcon isSelected={isSelected} />
  ),
  [NodeShapeType.Parallelogram]: (isSelected: boolean) => (
    <ParallelogramIcon isSelected={isSelected} />
  ),
  [NodeShapeType.Vee]: (isSelected: boolean) => (
    <VeeIcon isSelected={isSelected} />
  ),
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
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const sortedNodeShapes = Object.values(NodeShapeType).sort()
  const [localValue, setLocalValue] = React.useState(
    currentValue ?? NodeShapeType.Rectangle,
  )

  React.useEffect(() => {
    setLocalValue(currentValue ?? NodeShapeType.Rectangle)
  }, [currentValue])
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          width: 450,
        }}
      >
        {sortedNodeShapes.map((shape: NodeShapeType) => (
          <Box
            sx={{
              color: localValue === shape ? 'blue' : 'black',
              fontWeight: localValue === shape ? 'bold' : 'normal',
              p: 1,
              '&:hover': { cursor: 'pointer' },
            }}
            onClick={() => setLocalValue(shape)}
            key={shape}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: 130,
              }}
            >
              <NodeShape value={shape} isSelected={localValue === shape} />
              <Box>{nodeShapeDisplayNameMap[shape]}</Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="primary"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? NodeShapeType.Rectangle)
          }}
        >
          Cancel
        </Button>
        <Button
          sx={{
            color: '#FFFFFF',
            backgroundColor: '#337ab7',
            '&:hover': {
              backgroundColor: '#285a9b',
            },
          }}
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

export function NodeShape(props: {
  value: NodeShapeType
  isSelected: boolean
}): React.ReactElement {
  const { value, isSelected } = props
  return nodeShapeMap[value]?.(isSelected) ?? <Box>{value}</Box>
}
