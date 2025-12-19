import * as React from 'react'
import { Box, Typography } from '@mui/material'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { CustomGraphicKind } from '../WizardSteps/SelectTypeStep'
import { CHART_CONSTANTS } from '../utils/constants'
import { LabelWithTooltip, SliderWithInput } from '../components'

interface PropertiesFormProps {
  startAngle: number
  holeSize?: number
  kind: CustomGraphicKind
  onUpdate: (startAngle: number, holeSize?: number) => void
}

export const PropertiesForm: React.FC<PropertiesFormProps> = ({
  startAngle,
  holeSize,
  kind,
  onUpdate,
}) => {
  const handleStartAngleChange = (value: number) => {
    onUpdate(value, holeSize)
  }

  const handleHoleSizeChange = (value: number) => {
    onUpdate(startAngle, value)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Start Angle slider/input */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <LabelWithTooltip
          label="Start Angle (degrees)"
          tooltip="0° = 3 o'clock, 90° = 12 o'clock, 180° = 9 o'clock, 270° = 6 o'clock"
        />
        <SliderWithInput
          value={startAngle}
          min={0}
          max={360}
          step={1}
          onChange={handleStartAngleChange}
          inputProps={{ min: 0, max: 360 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
          Rotate the starting position of the chart
        </Typography>
      </Box>

      {/* Hole Size for Donut Chart only */}
      {kind === CustomGraphicsNameType.RingChart && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <LabelWithTooltip
            label="Hole Size"
            tooltip="0 = full pie (no hole), 1 = completely hollow. Recommended: 0.3-0.5"
          />
          <SliderWithInput
            value={holeSize ?? CHART_CONSTANTS.DEFAULT_HOLE_SIZE}
            min={0}
            max={1}
            step={0.05}
            onChange={handleHoleSizeChange}
            inputProps={{ min: 0, max: 1, step: 0.05 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {((holeSize ?? CHART_CONSTANTS.DEFAULT_HOLE_SIZE) * 100).toFixed(0)}% hole size
          </Typography>
        </Box>
      )}
    </Box>
  )
}
