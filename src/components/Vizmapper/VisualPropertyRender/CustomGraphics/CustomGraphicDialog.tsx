import * as React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
} from '@mui/material'
import { IdType } from '../../../../models/IdType'
import { CustomGraphicsType } from '../../../../models/VisualStyleModel'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../../models/VisualStyleModel/impl/DefaultVisualStyle'
import { CustomGraphicsNameType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { ColorType } from '../../../../models/VisualStyleModel/VisualPropertyValue'
import { AttributeName } from '../../../../models/TableModel/AttributeName'

// Import extracted components
import { SelectTypeStep, ChartKind } from './WizardSteps/SelectTypeStep'
import { ChartPreview } from './WizardSteps/ChartPreview'
import { StepProgress, WizardStep } from './WizardSteps/StepProgress'
import { StepGuidance } from './WizardSteps/StepGuidance'
import { AttributesForm } from './Forms/AttributesForm'
import { PaletteForm } from './Forms/PaletteForm'
import { PropertiesForm } from './Forms/PropertiesForm'

// Import custom hook
import { useCustomGraphicState } from './hooks/useCustomGraphicState'

/** Props for the multi-step wizard dialog */
interface CustomGraphicDialogProps {
  open: boolean
  initialValue: CustomGraphicsType | null
  currentNetworkId: IdType
  onCancel: () => void
  onConfirm: (value: CustomGraphicsType) => void
}

/**
 * Refactored multi-step wizard dialog for creating/editing custom graphics
 * This demonstrates the improved structure with separated concerns
 */
export const CustomGraphicDialog: React.FC<CustomGraphicDialogProps> = ({
  open,
  initialValue,
  currentNetworkId,
  onCancel,
  onConfirm,
}) => {
  // Use custom hook for state management
  const {
    currentStep,
    setCurrentStep,
    kind,
    setKind,
    currentProps,
    isLastStep,
    goToNextStep,
    goToPreviousStep,
    handleRemoveCharts,
    handleAttributesUpdate,
    handlePaletteChange,
    handlePropertiesUpdate,
  } = useCustomGraphicState({ open, initialValue })

  // Helper function to get step title
  const getStepTitle = (step: WizardStep): string => {
    switch (step) {
      case WizardStep.SelectType:
        return 'Select Custom Graphics Type'
      case WizardStep.SelectAttributes:
        return 'Select Node Attributes'
      case WizardStep.SelectPalette:
        return 'Choose Color Palette'
      case WizardStep.ConfigureProperties:
        return 'Configure Chart Properties'
      case WizardStep.Preview:
        return 'Preview & Finalize'
      default:
        return 'Custom Graphics'
    }
  }

  // Handler to remove graphics and reset to defaults
  const handleRemoveChartsClick = () => {
    const defaultGraphics = handleRemoveCharts()
    onConfirm(defaultGraphics)
  }

  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case WizardStep.SelectType:
        return <SelectTypeStep selectedKind={kind} onKindChange={setKind} />

      case WizardStep.SelectAttributes:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ChartPreview kind={kind} properties={currentProps} sticky={true} />
            <AttributesForm
              dataColumns={currentProps.cy_dataColumns}
              colors={currentProps.cy_colors}
              colorScheme={currentProps.cy_colorScheme}
              currentNetworkId={currentNetworkId}
              onUpdate={handleAttributesUpdate}
            />
          </Box>
        )

      case WizardStep.SelectPalette:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ChartPreview kind={kind} properties={currentProps} />
            <PaletteForm
              colorScheme={currentProps.cy_colorScheme}
              colors={currentProps.cy_colors}
              dataColumns={currentProps.cy_dataColumns}
              onUpdate={handlePaletteChange}
            />
          </Box>
        )

      case WizardStep.ConfigureProperties:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ChartPreview kind={kind} properties={currentProps} />
            <PropertiesForm
              startAngle={currentProps.cy_startAngle}
              holeSize={
                kind === CustomGraphicsNameType.RingChart
                  ? (currentProps as RingChartPropertiesType).cy_holeSize
                  : undefined
              }
              kind={kind}
              onUpdate={handlePropertiesUpdate}
            />
          </Box>
        )

      case WizardStep.Preview:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ChartPreview kind={kind} properties={currentProps} sticky={true} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Reuse step components for editing */}
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                <AttributesForm
                  dataColumns={currentProps.cy_dataColumns}
                  colors={currentProps.cy_colors}
                  colorScheme={currentProps.cy_colorScheme}
                  currentNetworkId={currentNetworkId}
                  onUpdate={handleAttributesUpdate}
                  hideGuidance={true}
                />
              </Box>

              {/* Palette Section */}
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                <PaletteForm
                  colorScheme={currentProps.cy_colorScheme}
                  colors={currentProps.cy_colors}
                  dataColumns={currentProps.cy_dataColumns}
                  onUpdate={handlePaletteChange}
                  hideGuidance={true}
                />
              </Box>

              {/* Properties Section */}
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                <PropertiesForm
                  startAngle={currentProps.cy_startAngle}
                  holeSize={
                    kind === CustomGraphicsNameType.RingChart
                      ? (currentProps as RingChartPropertiesType).cy_holeSize
                      : undefined
                  }
                  kind={kind}
                  onUpdate={handlePropertiesUpdate}
                  hideGuidance={true}
                />
              </Box>
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">{getStepTitle(currentStep)}</Typography>
        <Button
          sx={{
            color: '#F50157',
            backgroundColor: 'transparent',
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: '#F50157',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
          disabled={
            currentStep === WizardStep.SelectType ||
            initialValue?.name === CustomGraphicsNameType.None
          }
          size="small"
          onClick={handleRemoveChartsClick}
        >
          Remove Chart
        </Button>
      </DialogTitle>

      <StepProgress currentStep={currentStep} onStepClick={setCurrentStep} />

      <DialogContent dividers>{renderStepContent()}</DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            onClick={goToPreviousStep}
            disabled={currentStep === WizardStep.SelectType}
          >
            Back
          </Button>
        </Box>
        <Box>
          <Button onClick={onCancel} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (isLastStep) {
                onConfirm({
                  ...DEFAULT_CUSTOM_GRAPHICS,
                  type: 'chart',
                  name: kind,
                  properties: currentProps,
                })
              } else {
                goToNextStep()
              }
            }}
          >
            {isLastStep ? 'Confirm' : 'Next'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
