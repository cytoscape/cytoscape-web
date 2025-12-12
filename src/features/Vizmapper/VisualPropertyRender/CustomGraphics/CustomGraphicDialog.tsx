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
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../../models/VisualStyleModel/impl/defaultVisualStyle'
import { CustomGraphicsNameType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

// Import extracted components
import { SelectTypeStep, CustomGraphicKind } from './WizardSteps/SelectTypeStep'
import { CustomGraphicPreview } from './WizardSteps/CustomGraphicPreview'
import { StepProgress, WizardStep } from './WizardSteps/StepProgress'
import { StepGuidance } from './WizardSteps/StepGuidance'
import { AttributesForm } from './Forms/AttributesForm'
import { PaletteForm } from './Forms/PaletteForm'
import { PropertiesForm } from './Forms/PropertiesForm'
import { useCustomGraphicState } from './hooks/useCustomGraphicState'
import { COLORS } from './utils/constants'
import { isRingChartProperties } from './utils/typeGuards'
import { FormSection } from './components'

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
    hasNumericProperties,
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
        return (
          <SelectTypeStep
            selectedKind={kind}
            onKindChange={setKind}
            hasNumericProperties={hasNumericProperties}
          />
        )

      case WizardStep.SelectAttributes:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomGraphicPreview
              kind={kind}
              properties={currentProps}
              sticky={true}
            />
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
            <CustomGraphicPreview kind={kind} properties={currentProps} />
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
            <CustomGraphicPreview kind={kind} properties={currentProps} />
            <PropertiesForm
              startAngle={currentProps.cy_startAngle}
              holeSize={
                kind === CustomGraphicsNameType.RingChart &&
                isRingChartProperties(currentProps)
                  ? currentProps.cy_holeSize
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
            <CustomGraphicPreview
              kind={kind}
              properties={currentProps}
              sticky={true}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Reuse step components for editing */}
              <FormSection>
                <AttributesForm
                  dataColumns={currentProps.cy_dataColumns}
                  colors={currentProps.cy_colors}
                  colorScheme={currentProps.cy_colorScheme}
                  currentNetworkId={currentNetworkId}
                  onUpdate={handleAttributesUpdate}
                  hideGuidance={true}
                />
              </FormSection>

              {/* Palette Section */}
              <FormSection>
                <PaletteForm
                  colorScheme={currentProps.cy_colorScheme}
                  colors={currentProps.cy_colors}
                  dataColumns={currentProps.cy_dataColumns}
                  onUpdate={handlePaletteChange}
                  hideGuidance={true}
                />
              </FormSection>

              {/* Properties Section */}
              <FormSection>
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
              </FormSection>
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={false}
      onBackdropClick={() => {}}
    >
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
            color: COLORS.REMOVE,
            backgroundColor: 'transparent',
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: COLORS.REMOVE,
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

      <StepProgress
        currentStep={currentStep}
        onStepClick={setCurrentStep}
        hasNumericProperties={hasNumericProperties}
      />

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
            disabled={
              currentStep === WizardStep.SelectType && !hasNumericProperties
            }
            onClick={() => {
              if (isLastStep) {
                onConfirm({
                  ...DEFAULT_CUSTOM_GRAPHICS,
                  type: 'chart',
                  name: kind,
                  properties: currentProps,
                } as CustomGraphicsType)
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
