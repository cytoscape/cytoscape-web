import { EdgeArrowShapeType } from '../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import {
  CircleArrowIcon,
  DiamondArrowIcon,
  TeeArrowIcon,
  TriangleArrowIcon,
  SquareArrowIcon,
  NoneArrowIcon,
} from './VisualPropertyValueIcons'

const edgeArrowShapeMap: Record<EdgeArrowShapeType, React.ReactElement> = {
  none: <NoneArrowIcon />,
  circle: <CircleArrowIcon />,
  diamond: <DiamondArrowIcon />,
  square: <SquareArrowIcon />,
  triangle: <TriangleArrowIcon />,
  tee: <TeeArrowIcon />,
}

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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignContent: 'center',
                width: 100,
              }}
            >
              <Box>{edgeArrowShape}</Box>
              <EdgeArrowShape value={edgeArrowShape} />
            </Box>
          </Box>
        ),
      )}
    </Box>
  )
}

export function EdgeArrowShape(props: {
  value: EdgeArrowShapeType
}): React.ReactElement {
  return edgeArrowShapeMap[props.value] ?? <Box>{props.value}</Box>
}
