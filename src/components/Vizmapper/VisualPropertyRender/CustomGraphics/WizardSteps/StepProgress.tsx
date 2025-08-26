import * as React from 'react'
import { Box, Typography } from '@mui/material'
import PieChartIcon from '@mui/icons-material/PieChart'
import ListAltIcon from '@mui/icons-material/ListAlt'
import PaletteIcon from '@mui/icons-material/Palette'
import SettingsIcon from '@mui/icons-material/Settings'
import VisibilityIcon from '@mui/icons-material/Visibility'

export enum WizardStep {
  SelectType = 0,
  SelectAttributes = 1,
  SelectPalette = 2,
  ConfigureProperties = 3,
  Preview = 4,
}

interface StepProgressProps {
  currentStep: WizardStep
  onStepClick: (step: WizardStep) => void
  hasNumericProperties?: boolean
}

const STEP_CONFIG = [
  { step: WizardStep.SelectType, label: 'Type', icon: PieChartIcon },
  { step: WizardStep.SelectAttributes, label: 'Attributes', icon: ListAltIcon },
  { step: WizardStep.SelectPalette, label: 'Colors', icon: PaletteIcon },
  {
    step: WizardStep.ConfigureProperties,
    label: 'Properties',
    icon: SettingsIcon,
  },
  { step: WizardStep.Preview, label: 'Preview', icon: VisibilityIcon },
]

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  onStepClick,
  hasNumericProperties = true,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        p: 1,
        borderBottom: '1px solid #e0e0e0',
        bgcolor: '#fafafa',
      }}
    >
      {STEP_CONFIG.map((stepInfo, index) => {
        const IconComponent = stepInfo.icon
        const isDisabled =
          !hasNumericProperties && stepInfo.step > WizardStep.SelectType
        const isClickable = stepInfo.step <= currentStep || hasNumericProperties

        return (
          <React.Fragment key={stepInfo.step}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Box
                onClick={() => isClickable && onStepClick(stepInfo.step)}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'medium',
                  bgcolor: isDisabled
                    ? '#f0f0f0'
                    : currentStep === stepInfo.step
                      ? '#1976d2'
                      : '#e0e0e0',
                  color: isDisabled
                    ? '#999'
                    : currentStep === stepInfo.step
                      ? 'white'
                      : '#666',
                  border:
                    currentStep > stepInfo.step ? '2px solid #4caf50' : 'none',
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  '&:hover': isClickable
                    ? {
                        transform: 'scale(1.1)',
                        bgcolor:
                          currentStep === stepInfo.step ? '#1565c0' : '#d0d0d0',
                      }
                    : {},
                }}
              >
                {currentStep > stepInfo.step ? (
                  '✓'
                ) : (
                  <IconComponent sx={{ fontSize: 14 }} />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: isDisabled ? '#999' : 'inherit',
                  textAlign: 'center',
                  fontSize: '0.7rem',
                }}
              >
                {stepInfo.label}
              </Typography>
            </Box>
            {index < STEP_CONFIG.length - 1 && (
              <Box
                sx={{
                  width: 20,
                  height: 1,
                  bgcolor: isDisabled ? '#f0f0f0' : '#e0e0e0',
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </Box>
  )
}
