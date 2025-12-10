import * as React from 'react'
import { Box, Typography, Slider, TextField, Tooltip } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { StepGuidance } from '../WizardSteps/StepGuidance'
import { CustomGraphicKind } from '../WizardSteps/SelectTypeStep'

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
  const handleStartAngleChange = (newValue: number | number[]) => {
    const vNum = Array.isArray(newValue) ? newValue[0] : newValue
    onUpdate(vNum, holeSize)
  }

  const handleStartAngleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    let v = parseInt(e.target.value, 10)
    if (isNaN(v)) v = 0
    v = Math.max(0, Math.min(360, v))
    onUpdate(v, holeSize)
  }

  const handleHoleSizeChange = (newValue: number | number[]) => {
    const vNum = Array.isArray(newValue) ? newValue[0] : newValue
    onUpdate(startAngle, vNum)
  }

  const handleHoleSizeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    let v = parseFloat(e.target.value)
    if (isNaN(v)) v = 0.4
    v = Math.max(0, Math.min(1, v))
    onUpdate(startAngle, v)
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="subtitle2">Start Angle (degrees)</Typography>
          <Tooltip title="0° → 3 o'clock; 90° → 12 o'clock; 180° → 9 o'clock; 270° → 6 o'clock">
            <InfoOutlinedIcon fontSize="small" color="action" />
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Slider
            value={startAngle}
            min={0}
            max={360}
            step={1}
            valueLabelDisplay="auto"
            onChange={(_, newValue) => handleStartAngleChange(newValue)}
            sx={{ flex: 1 }}
          />
          <TextField
            type="number"
            value={startAngle}
            onChange={handleStartAngleInputChange}
            inputProps={{ min: 0, max: 360 }}
            size="small"
            sx={{ width: 80 }}
          />
        </Box>
      </Box>

      {/* Hole Size for RingChart only */}
      {kind === CustomGraphicsNameType.RingChart && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2">Hole Size (0–1)</Typography>
            <Tooltip title="0 → full pie (no hole); 1 → completely hollow (no chart)">
              <InfoOutlinedIcon fontSize="small" color="action" />
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider
              value={holeSize ?? 0.4}
              min={0}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              onChange={(_, newValue) => handleHoleSizeChange(newValue)}
              sx={{ flex: 1 }}
            />
            <TextField
              type="number"
              value={holeSize ?? 0.4}
              onChange={handleHoleSizeInputChange}
              inputProps={{ min: 0, max: 1, step: 0.05 }}
              size="small"
              sx={{ width: 80 }}
            />
          </Box>
        </Box>
      )}
    </Box>
  )
}
