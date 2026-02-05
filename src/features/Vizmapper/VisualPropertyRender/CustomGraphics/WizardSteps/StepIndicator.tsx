import * as React from 'react'
import { Box, Typography, Button } from '@mui/material'
import PieChartIcon from '@mui/icons-material/PieChart'
import ListAltIcon from '@mui/icons-material/ListAlt'
import PaletteIcon from '@mui/icons-material/Palette'
import SettingsIcon from '@mui/icons-material/Settings'
import { CustomGraphicKind } from './SelectTypeStep'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

export interface Step {
  id: number
  title: string
  description: string
  isComplete: (state: StepState) => boolean
  isAccessible: (state: StepState, currentStep: number) => boolean
}

export interface StepState {
  chartType: CustomGraphicKind | null
  selectedAttributes: string[]
  colorMode: 'palette' | 'custom'
  selectedPalette: string | null
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  formState: StepState
  onStepClick: (stepId: number) => void
}

// Icon mapping for steps
const stepIcons = {
  1: PieChartIcon,
  2: ListAltIcon,
  3: PaletteIcon,
  4: SettingsIcon,
}

export function StepIndicator({
  steps,
  currentStep,
  formState,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        width: '100%',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {steps.map((step, index) => {
        const isCurrent = step.id === currentStep
        const isAccessible =
          step.isAccessible(formState, currentStep) && step.id <= currentStep
        const isClickable = isAccessible && !isCurrent
        const IconComponent = stepIcons[step.id as keyof typeof stepIcons]

        return (
          <Button
            key={step.id}
            onClick={() => isClickable && onStepClick(step.id)}
            disabled={!isClickable}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              py: 1.5,
              px: 1,
              minWidth: 0,
              textTransform: 'none',
              color: isCurrent ? 'primary.main' : 'text.secondary',
              position: 'relative',
              borderRadius: 0,
              '&:hover': isClickable
                ? {
                    bgcolor: 'action.hover',
                  }
                : {},
              '&:disabled': {
                opacity: 0.5,
              },
              '&::after': isCurrent
                ? {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    bgcolor: 'primary.main',
                  }
                : {},
            }}
          >
            {IconComponent && (
              <IconComponent
                sx={{
                  fontSize: 20,
                  color: isCurrent ? 'primary.main' : 'text.secondary',
                }}
              />
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: isCurrent ? 600 : 400,
                fontSize: '0.75rem',
                color: isCurrent ? 'primary.main' : 'text.secondary',
              }}
            >
              {step.title}
            </Typography>
          </Button>
        )
      })}
    </Box>
  )
}
