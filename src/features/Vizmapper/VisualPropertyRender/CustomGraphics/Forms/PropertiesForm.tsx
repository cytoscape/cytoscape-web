import * as React from 'react'
import { Box } from '@mui/material'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { StepGuidance } from '../WizardSteps/StepGuidance'
import { CustomGraphicKind } from '../WizardSteps/SelectTypeStep'
import { CHART_CONSTANTS } from '../utils/constants'
import { LabelWithTooltip, SliderWithInput } from '../components'

interface PropertiesFormProps {
  startAngle: number
  holeSize?: number
  kind: CustomGraphicKind
  onUpdate: (startAngle: number, holeSize?: number) => void
  hideGuidance?: boolean
}

export const PropertiesForm: React.FC<PropertiesFormProps> = ({
  startAngle,
  holeSize,
  kind,
  onUpdate,
  hideGuidance = false,
}) => {
  const handleStartAngleChange = (value: number) => {
    onUpdate(value, holeSize)
  }

  const handleHoleSizeChange = (value: number) => {
    onUpdate(startAngle, value)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!hideGuidance && (
        <StepGuidance
          title="Step 3: Configure Custom Graphic Properties"
          description={`Adjust the start angle and ${kind === CustomGraphicsNameType.RingChart ? 'hole size' : 'other properties'} for your chart.`}
        />
      )}

      {/* Start Angle slider/input */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}>
        <LabelWithTooltip
          label="Start Angle (degrees)"
          tooltip="0° → 3 o'clock; 90° → 12 o'clock; 180° → 9 o'clock; 270° → 6 o'clock"
        />
        <SliderWithInput
          value={startAngle}
          min={0}
          max={360}
          step={1}
          onChange={handleStartAngleChange}
          inputProps={{ min: 0, max: 360 }}
        />
      </Box>

      {/* Hole Size for RingChart only */}
      {kind === CustomGraphicsNameType.RingChart && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}>
          <LabelWithTooltip
            label="Hole Size (0–1)"
            tooltip="0 → full pie (no hole); 1 → completely hollow (no chart)"
          />
          <SliderWithInput
            value={holeSize ?? CHART_CONSTANTS.DEFAULT_HOLE_SIZE}
            min={0}
            max={1}
            step={0.05}
            onChange={handleHoleSizeChange}
            inputProps={{ min: 0, max: 1, step: 0.05 }}
          />
        </Box>
      )}
    </Box>
  )
}
