import { NodeBorderLineType } from '../../models/VisualStyleModel/VisualPropertyValue'
import { Box } from '@mui/material'

export function NodeBorderLinePicker(props: {
  currentValue: NodeBorderLineType
  onClick: (borderLine: NodeBorderLineType) => void
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
      {Object.values(NodeBorderLineType).map(
        (borderLine: NodeBorderLineType) => (
          <Box
            sx={{
              color: currentValue === borderLine ? 'blue' : 'black',
              width: 100,
              p: 1,
              '&:hover': { cursor: 'pointer' },
            }}
            onClick={() => onClick(borderLine)}
            key={borderLine}
          >
            {borderLine}
          </Box>
        ),
      )}
    </Box>
  )
}

export function NodeBorderLine(props: {
  borderLine: NodeBorderLineType
}): React.ReactElement {
  return <Box>{props.borderLine}</Box>
}
