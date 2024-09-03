import { EdgeLineType } from '../../../models/VisualStyleModel/VisualPropertyValue'
import { Box, Button } from '@mui/material'
import {
  DottedLineIcon,
  SolidLineIcon,
  DashedLineIcon,
} from '../VisualStyleIcons'
import React from 'react'

const edgeLineMap: Record<
  EdgeLineType,
  (isSelected: boolean) => React.ReactElement
> = {
  [EdgeLineType.Solid]: (isSelected: boolean) => (
    <SolidLineIcon isSelected={isSelected} />
  ),
  [EdgeLineType.Dotted]: (isSelected: boolean) => (
    <DottedLineIcon isSelected={isSelected} />
  ),
  [EdgeLineType.Dashed]: (isSelected: boolean) => (
    <DashedLineIcon isSelected={isSelected} />
  ),
}
export function EdgeLinePicker(props: {
  currentValue: EdgeLineType | null
  onValueChange: (edgeLine: EdgeLineType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const sortedEdgeLines = Object.values(EdgeLineType).sort()
  const [localValue, setLocalValue] = React.useState(
    currentValue ?? EdgeLineType.Solid,
  )

  React.useEffect(() => {
    setLocalValue(currentValue ?? EdgeLineType.Solid)
  }, [currentValue])

  return (
    <Box sx={{ p: 1 }}>
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
              color: localValue === edgeLine ? 'blue' : 'black',
              fontWeight: localValue === edgeLine ? 'bold' : 'normal',
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
                width: 80,
              }}
            >
              <EdgeLine value={edgeLine} isSelected={localValue === edgeLine} />
              <Box>{edgeLine}</Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="error"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? EdgeLineType.Solid)
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

export function EdgeLine(props: {
  value: EdgeLineType
  isSelected: boolean
}): React.ReactElement {
  const { value, isSelected } = props
  return edgeLineMap[value]?.(isSelected) ?? <Box>{value}</Box>
}
