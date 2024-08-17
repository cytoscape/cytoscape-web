import { EdgeArrowShapeType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import {
  CircleArrowIcon,
  DiamondArrowIcon,
  TeeArrowIcon,
  TriangleArrowIcon,
  SquareArrowIcon,
  NoneArrowIcon,
} from '../VisualStyleIcons'

const edgeArrowShapeMap: Record<EdgeArrowShapeType, (isSelected: boolean) => React.ReactElement> = {
  [EdgeArrowShapeType.None]: (isSelected: boolean) => <NoneArrowIcon isSelected={isSelected} />,
  [EdgeArrowShapeType.Circle]: (isSelected: boolean) => <CircleArrowIcon isSelected={isSelected} />,
  [EdgeArrowShapeType.Diamond]: (isSelected: boolean) => <DiamondArrowIcon isSelected={isSelected} />,
  [EdgeArrowShapeType.Square]: (isSelected: boolean) => <SquareArrowIcon isSelected={isSelected} />,
  [EdgeArrowShapeType.Triangle]: (isSelected: boolean) => <TriangleArrowIcon isSelected={isSelected} />,
  [EdgeArrowShapeType.Tee]: (isSelected: boolean) => <TeeArrowIcon isSelected={isSelected} />,
}

export function EdgeArrowShapePicker(props: {
  currentValue: EdgeArrowShapeType | null
  onValueChange: (edgeArrowShape: EdgeArrowShapeType) => void
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const sortedEdgeArrowShapes = Object.values(EdgeArrowShapeType).sort();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      {sortedEdgeArrowShapes.map(
        (edgeArrowShape: EdgeArrowShapeType) => (
          <Box
            sx={{
              color: currentValue === edgeArrowShape ? 'blue' : 'black',
              fontWeight: currentValue === edgeArrowShape ? 'bold' : 'normal',
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
              <EdgeArrowShape value={edgeArrowShape} isSelected={currentValue === edgeArrowShape} />
              <Box>{edgeArrowShape}</Box>
            </Box>
          </Box>
        ),
      )}
    </Box>
  )
}

export function EdgeArrowShape(props: {
  value: EdgeArrowShapeType,
  isSelected: boolean
}): React.ReactElement {
  const { value, isSelected } = props
  return edgeArrowShapeMap[value](isSelected) ?? <Box>{value}</Box>
}
