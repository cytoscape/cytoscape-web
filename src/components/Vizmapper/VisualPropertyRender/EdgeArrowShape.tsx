import { EdgeArrowShapeType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import {
  CircleArrowIcon,
  DiamondArrowIcon,
  TeeArrowIcon,
  TriangleArrowIcon,
  SquareArrowIcon,
  NoneArrowIcon,
  OpenCircleArrowIcon,
  OpenDiamondArrowIcon,
  OpenSquareArrowIcon,
  OpenTriangleArrowIcon,
} from '../VisualStyleIcons'

const edgeArrowShapeMap: Record<EdgeArrowShapeType, React.ReactElement> = {
  [EdgeArrowShapeType.None]: <NoneArrowIcon />,
  [EdgeArrowShapeType.Circle]: <CircleArrowIcon />,
  [EdgeArrowShapeType.Diamond]: <DiamondArrowIcon />,
  [EdgeArrowShapeType.Square]: <SquareArrowIcon />,
  [EdgeArrowShapeType.Triangle]: <TriangleArrowIcon />,
  [EdgeArrowShapeType.Tee]: <TeeArrowIcon />,
  [EdgeArrowShapeType.Arrow]: <TriangleArrowIcon />,
  [EdgeArrowShapeType.OpenCircle]: <OpenCircleArrowIcon />,
  [EdgeArrowShapeType.OpenDiamond]: <OpenDiamondArrowIcon />,
  [EdgeArrowShapeType.OpenSquare]: <OpenSquareArrowIcon />,
  [EdgeArrowShapeType.OpenDelta]: <OpenTriangleArrowIcon />,
}

export function EdgeArrowShapePicker(props: {
  currentValue: EdgeArrowShapeType | null
  onValueChange: (edgeArrowShape: EdgeArrowShapeType) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        width: 350,
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
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignContent: 'center',
                width: 100,
              }}
            >
              <EdgeArrowShape value={edgeArrowShape} />
              <Box>{edgeArrowShape}</Box>
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
