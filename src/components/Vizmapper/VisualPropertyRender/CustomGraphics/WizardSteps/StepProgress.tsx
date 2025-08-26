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
                onClick={() => onStepClick(stepInfo.step)}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'medium',
                  bgcolor:
                    currentStep === stepInfo.step ? '#1976d2' : '#e0e0e0',
                  color: currentStep === stepInfo.step ? 'white' : '#666',
                  border:
                    currentStep > stepInfo.step ? '2px solid #4caf50' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    bgcolor:
                      currentStep === stepInfo.step ? '#1565c0' : '#d0d0d0',
                  },
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
                onClick={() => onStepClick(stepInfo.step)}
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: currentStep === stepInfo.step ? 'bold' : 'normal',
                  color: currentStep === stepInfo.step ? '#1976d2' : '#666',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  '&:hover': {
                    color:
                      currentStep === stepInfo.step ? '#1565c0' : '#1976d2',
                  },
                }}
              >
                {stepInfo.label}
              </Typography>
            </Box>
            {index < STEP_CONFIG.length - 1 && (
              <Box
                sx={{
                  width: 16,
                  height: 2,
                  bgcolor: currentStep > stepInfo.step ? '#4caf50' : '#e0e0e0',
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </Box>
  )
}
