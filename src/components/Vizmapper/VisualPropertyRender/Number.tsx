import { Box, Typography, debounce } from '@mui/material'
import { useState } from 'react'
import {
  VisualPropertyName,
  NodeVisualPropertyName,
} from '../../../models/VisualStyleModel/VisualPropertyName'
import { LockSizeCheckbox } from './Checkbox'
import { IdType } from '../../../models/IdType'

import { MantineProvider, NumberInput as NumericInput } from '@mantine/core'
import React from 'react'

export function NumberInput(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
  closePopover: () => void
  currentNetworkId: IdType
  vpName: VisualPropertyName
  showCheckbox?: boolean
}): React.ReactElement {
  const {
    onValueChange,
    currentValue,
    vpName,
    currentNetworkId,
    showCheckbox,
  } = props
  const isSize =
    vpName === NodeVisualPropertyName.NodeHeight ||
    vpName === NodeVisualPropertyName.NodeWidth
  const isHeight = vpName === NodeVisualPropertyName.NodeHeight

  const debouncedValueChange = debounce(onValueChange, 150)
  const [localValue, setLocalValue] = useState<number>(currentValue ?? 0)

  React.useEffect(() => {
    setLocalValue(currentValue ?? 0)
  }, [currentValue])

  return (
    <MantineProvider>
      <Box>
        <Box>
          <NumericInput
            style={{
              margin: 15,
            }}
            onChange={(v) => {
              setLocalValue(Number(v))
              debouncedValueChange(Number(v))
            }}
            value={localValue ?? 0}
          ></NumericInput>
        </Box>
        {isSize && showCheckbox && (
          <Box sx={{ pl: 2 }}>
            <LockSizeCheckbox currentNetworkId={currentNetworkId} />
          </Box>
        )}
      </Box>
    </MantineProvider>
  )
}

export function NumberRender(props: { value: number }): React.ReactElement {
  const { value } = props
  let displayValue = value ?? 0

  displayValue =
    displayValue.toFixed != null
      ? Number(displayValue.toFixed(0))
      : displayValue
  return (
    <Box>
      <Typography sx={{ fontSize: 14 }} variant="body1">
        {displayValue}
      </Typography>
    </Box>
  )
}
