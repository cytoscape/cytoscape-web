import { NodeBorderLineType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Button } from '@mui/material'
import {
  SolidLineIcon,
  DottedLineIcon,
  DashedLineIcon,
  DoubleLineIcon,
} from '../VisualStyleIcons'
import React from 'react'

const nodeLineMap: Record<
  NodeBorderLineType,
  (isSelected: boolean) => React.ReactElement
> = {
  [NodeBorderLineType.Solid]: (isSelected: boolean) => (
    <SolidLineIcon isSelected={isSelected} />
  ),
  [NodeBorderLineType.Dotted]: (isSelected: boolean) => (
    <DottedLineIcon isSelected={isSelected} />
  ),
  [NodeBorderLineType.Dashed]: (isSelected: boolean) => (
    <DashedLineIcon isSelected={isSelected} />
  ),
  [NodeBorderLineType.Double]: (isSelected: boolean) => (
    <DoubleLineIcon isSelected={isSelected} />
  ),
}

export function NodeBorderLinePicker(props: {
  currentValue: NodeBorderLineType | null
  onValueChange: (borderLine: NodeBorderLineType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const sortedBorderLines = Object.values(NodeBorderLineType).sort()

  const [localValue, setLocalValue] = React.useState(
    currentValue ?? NodeBorderLineType.Solid,
  )

  React.useEffect(() => {
    setLocalValue(currentValue ?? NodeBorderLineType.Solid)
  }, [currentValue])
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        {sortedBorderLines.map((borderLine: NodeBorderLineType) => (
          <Box
            sx={{
              color: localValue === borderLine ? 'blue' : 'black',
              fontWeight: localValue === borderLine ? 'bold' : 'normal',
              p: 1,
              '&:hover': { cursor: 'pointer' },
            }}
            onClick={() => setLocalValue(borderLine)}
            key={borderLine}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: 'column',
                alignItems: 'center',
                width: 80,
              }}
            >
              <NodeBorderLine
                value={borderLine}
                isSelected={localValue === borderLine}
              />
              <Box>{borderLine}</Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="error"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? NodeBorderLineType.Solid)
          }}
        >
          Cancel
        </Button>
        <Button
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

export function NodeBorderLine(props: {
  value: NodeBorderLineType
  isSelected: boolean
}): React.ReactElement {
  const { value, isSelected } = props
  return nodeLineMap[value]?.(isSelected) ?? <Box>{value}</Box>
}
