import { NodeBorderLineType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import {
  SolidLineIcon,
  DottedLineIcon,
  DashedLineIcon,
  DoubleLineIcon,
} from '../VisualStyleIcons'

const nodeLineMap: Record<NodeBorderLineType, (isSelected: boolean) => React.ReactElement> = {
  [NodeBorderLineType.Solid]: (isSelected: boolean) => <SolidLineIcon isSelected={isSelected} />,
  [NodeBorderLineType.Dotted]: (isSelected: boolean) => <DottedLineIcon isSelected={isSelected} />,
  [NodeBorderLineType.Dashed]: (isSelected: boolean) => <DashedLineIcon isSelected={isSelected} />,
  [NodeBorderLineType.Double]: (isSelected: boolean) => <DoubleLineIcon isSelected={isSelected} />,
};

export function NodeBorderLinePicker(props: {
  currentValue: NodeBorderLineType | null
  onValueChange: (borderLine: NodeBorderLineType) => void
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const sortedBorderLines = Object.values(NodeBorderLineType).sort();
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      {sortedBorderLines.map(
        (borderLine: NodeBorderLineType) => (
          <Box
            sx={{
              color: currentValue === borderLine ? 'blue' : 'black',
              fontWeight: currentValue === borderLine ? 'bold' : 'normal',
              width: 100,
              p: 1,
              '&:hover': { cursor: 'pointer' },
            }}
            onClick={() => onValueChange(borderLine)}
            key={borderLine}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: 'column',
                alignItems: 'center',
                width: 100,
              }}
            >
              <NodeBorderLine value={borderLine} isSelected={currentValue === borderLine} />
              <Box>{borderLine}</Box>
            </Box>
          </Box>
        ),
      )}
    </Box>
  )
}

export function NodeBorderLine(props: {
  value: NodeBorderLineType,
  isSelected: boolean
}): React.ReactElement {
  const { value, isSelected } = props
  return nodeLineMap[value](isSelected) ?? <Box>{value}</Box>
}
