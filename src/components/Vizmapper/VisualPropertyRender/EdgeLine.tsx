import { EdgeLineType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import {
  DottedLineIcon,
  SolidLineIcon,
  DashedLineIcon,
} from '../VisualStyleIcons'
const edgeLineMap: Record<EdgeLineType, (isSelected: boolean) => React.ReactElement> = {
  [EdgeLineType.Solid]: (isSelected: boolean) => <SolidLineIcon isSelected={isSelected} />,
  [EdgeLineType.Dotted]: (isSelected: boolean) => <DottedLineIcon isSelected={isSelected} />,
  [EdgeLineType.Dashed]: (isSelected: boolean) => <DashedLineIcon isSelected={isSelected} />,
}
export function EdgeLinePicker(props: {
  currentValue: EdgeLineType | null
  onValueChange: (edgeLine: EdgeLineType) => void
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const sortedEdgeLines = Object.values(EdgeLineType).sort();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      {sortedEdgeLines.map((edgeLine: EdgeLineType) => (
        <Box
          sx={{
            color: currentValue === edgeLine ? 'blue' : 'black',
            fontWeight: currentValue === edgeLine ? 'bold' : 'normal',
            width: 100,
            p: 1,
            '&:hover': { cursor: 'pointer' },
          }}
          onClick={() => onValueChange(edgeLine)}
          key={edgeLine}
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
            <EdgeLine value={edgeLine} isSelected={currentValue === edgeLine} />
            <Box>{edgeLine}</Box>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export function EdgeLine(props: { value: EdgeLineType, isSelected: boolean }): React.ReactElement {
  const { value, isSelected } = props
  return edgeLineMap[value](isSelected) ?? <Box>{value}</Box>
}
