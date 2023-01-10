import { NodeBorderLineType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'
import {
  SolidLineIcon,
  DottedLineIcon,
  DashedLineIcon,
  DoubleLineIcon,
} from '../VisualStyleIcons'

const nodeLineMap: Record<NodeBorderLineType, React.ReactElement> = {
  solid: <SolidLineIcon />,
  dotted: <DottedLineIcon />,
  dashed: <DashedLineIcon />,
  double: <DoubleLineIcon />,
}

export function NodeBorderLinePicker(props: {
  currentValue: NodeBorderLineType | null
  onValueChange: (borderLine: NodeBorderLineType) => void
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
      {Object.values(NodeBorderLineType).map(
        (borderLine: NodeBorderLineType) => (
          <Box
            sx={{
              color: currentValue === borderLine ? 'blue' : 'black',
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
              <NodeBorderLine value={borderLine} />
              <Box>{borderLine}</Box>
            </Box>
          </Box>
        ),
      )}
    </Box>
  )
}

export function NodeBorderLine(props: {
  value: NodeBorderLineType
}): React.ReactElement {
  return nodeLineMap[props.value] ?? <Box>{props.value}</Box>
}
