import * as React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  IconButton,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PieChartIcon from '@mui/icons-material/PieChart'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import ListAltIcon from '@mui/icons-material/ListAlt'
import SettingsIcon from '@mui/icons-material/Settings'
import PaletteIcon from '@mui/icons-material/Palette'
import { IdType } from '../../../../models/IdType'
import { CustomGraphicsType } from '../../../../models/VisualStyleModel'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../../models/VisualStyleModel/impl/defaultVisualStyle'
import { CustomGraphicsNameType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

import { CustomGraphicPreview } from './WizardSteps/CustomGraphicPreview'
import { AttributesForm } from './Forms/AttributesForm'
import { ColorsForm } from './Forms/ColorsForm'
import { PropertiesForm } from './Forms/PropertiesForm'
import { useCustomGraphicState } from './hooks/useCustomGraphicState'
import { CHART_CONSTANTS, COLORS } from './utils/constants'
import { isRingChartProperties } from './utils/typeGuards'
import { ColorType } from '../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { AttributeName } from '../../../../models/TableModel/AttributeName'

/** Props for the custom graphics dialog */
interface CustomGraphicDialogProps {
  open: boolean
  initialValue: CustomGraphicsType | null
  currentNetworkId: IdType
  onCancel: () => void
  onConfirm: (value: CustomGraphicsType) => void
}

/**
 * Wizard-style custom graphics dialog with 4 steps
 * Follows UX principles: progressive disclosure, immediate feedback
 */
export const CustomGraphicDialog: React.FC<CustomGraphicDialogProps> = ({
  open,
  initialValue,
  currentNetworkId,
  onCancel,
  onConfirm,
}) => {
  const {
    kind,
    setKind,
    currentProps,
    hasNumericProperties,
    handleRemoveCharts,
    handleAttributesAndColorsUpdate,
    handlePropertiesUpdate,
  } = useCustomGraphicState({ open, initialValue })

  // Wizard step state
  const [activeStep, setActiveStep] = React.useState(0)
  const steps = ['Chart Type', 'Attributes', 'Colors', 'Properties']

  // Determine if this is a new chart or editing existing
  const isNewChart =
    !initialValue || initialValue.name === CustomGraphicsNameType.None

  // Reset step when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setActiveStep(0)
    }
  }, [open])

  // Initialize colors to gray when entering step 3 (Colors) if needed
  // This is a backup in case user navigates directly or goes back/forward
  const prevStepRef = React.useRef<number>(0)
  React.useEffect(() => {
    // Only initialize when first entering step 3 (Colors step)
    if (
      activeStep === 2 &&
      prevStepRef.current !== 2 &&
      currentProps.cy_dataColumns.length > 0 &&
      !currentProps.cy_colorScheme
    ) {
      // Check if colors need to be set to gray
      const needsGray =
        currentProps.cy_colors.length !== currentProps.cy_dataColumns.length ||
        currentProps.cy_colors.some((color) => color !== COLORS.DEFAULT)
      if (needsGray) {
        const grayColors = currentProps.cy_dataColumns.map(() => COLORS.DEFAULT)
        handleAttributesAndColorsUpdate(
          currentProps.cy_dataColumns,
          grayColors,
          '',
        )
      }
    }
    prevStepRef.current = activeStep
  }, [
    activeStep,
    currentProps.cy_dataColumns.length,
    currentProps.cy_colorScheme,
  ])

  // Handler to remove graphics and reset to defaults
  const handleRemoveChartsClick = () => {
    const defaultGraphics = handleRemoveCharts()
    onConfirm(defaultGraphics)
  }

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return kind !== null && hasNumericProperties
      case 1:
        return currentProps.cy_dataColumns.length > 0
      case 2:
        return currentProps.cy_dataColumns.length > 0
      case 3:
        return currentProps.cy_dataColumns.length > 0
      default:
        return false
    }
  }

  // Navigation handlers
  const handleNext = () => {
    if (isStepValid(activeStep)) {
      const nextStep = Math.min(activeStep + 1, steps.length - 1)
      // When moving to Colors step (step 2), initialize colors to gray if no palette
      // Do this synchronously before state update to prevent flicker
      if (
        nextStep === 2 &&
        currentProps.cy_dataColumns.length > 0 &&
        !currentProps.cy_colorScheme
      ) {
        const grayColors = currentProps.cy_dataColumns.map(() => COLORS.DEFAULT)
        handleAttributesAndColorsUpdate(
          currentProps.cy_dataColumns,
          grayColors,
          '',
        )
      }
      setActiveStep(nextStep)
    }
  }

  const handleBack = () => {
    setActiveStep((prevStep) => Math.max(prevStep - 1, 0))
  }

  const handleConfirm = () => {
    if (!isStepValid(3)) return
    onConfirm({
      ...DEFAULT_CUSTOM_GRAPHICS,
      type: 'chart',
      name: kind,
      properties: currentProps,
    } as CustomGraphicsType)
  }

  // Wrapper for AttributesForm in compact view
  const handleAttributesUpdateCompact = (
    dataColumns: AttributeName[],
    colors: ColorType[],
  ) => {
    handleAttributesAndColorsUpdate(
      dataColumns,
      colors,
      currentProps.cy_colorScheme,
    )
  }

  // Handle attributes update (step 2)
  // Colors are auto-generated here, but can be changed in step 3
  const handleAttributesUpdate = (
    dataColumns: string[],
    colors: ColorType[],
  ) => {
    // Preserve colorScheme when updating attributes in step 2
    // If switching to custom colors, clear the scheme
    handleAttributesAndColorsUpdate(
      dataColumns,
      colors,
      currentProps.cy_colorScheme,
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={false}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6">Custom Graphics</Typography>
        <Button
          size="small"
          onClick={handleRemoveChartsClick}
          disabled={isNewChart}
          sx={{
            color: '#F50157',
            backgroundColor: 'transparent',
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: '#F50157',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
              opacity: 0.5,
            },
          }}
        >
          Remove custom graphic
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {isNewChart ? (
          // Wizard view for new charts
          <Box
            sx={{
              display: 'flex',
              gap: 0,
              height: '100%',
              minHeight: 500,
            }}
          >
            {/* Left Column: Wizard Steps */}
            <Box
              sx={{
                flex: '1 1 60%',
                overflowY: 'auto',
                borderRight: 1,
                borderColor: 'divider',
              }}
            >
              {/* Step Indicator */}
              <Box
                sx={{ p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Stepper activeStep={activeStep} alternativeLabel>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>

              {/* Step Content */}
              <Box sx={{ p: 3 }}>
                {/* Step 1: Chart Type */}
                {activeStep === 0 && (
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <PieChartIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Choose Chart Type
                      </Typography>
                    </Box>
                    {!hasNumericProperties && (
                      <Alert severity="warning" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                          This network does not have any numeric properties in
                          the node table. Custom graphics require numeric data
                          to display values.
                        </Typography>
                      </Alert>
                    )}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 3,
                        mt: 4,
                        opacity: hasNumericProperties ? 1 : 0.5,
                        pointerEvents: hasNumericProperties ? 'auto' : 'none',
                      }}
                    >
                      {(
                        [
                          CustomGraphicsNameType.PieChart,
                          CustomGraphicsNameType.RingChart,
                        ] as const
                      ).map((k) => {
                        const selected = kind === k
                        const Icon =
                          k === CustomGraphicsNameType.PieChart
                            ? PieChartIcon
                            : DonutLargeIcon
                        const label =
                          k === CustomGraphicsNameType.PieChart
                            ? 'Pie Chart'
                            : 'Donut Chart'
                        return (
                          <Box
                            key={k}
                            onClick={() => hasNumericProperties && setKind(k)}
                            sx={{
                              cursor: hasNumericProperties
                                ? 'pointer'
                                : 'not-allowed',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              p: 3,
                              borderRadius: 2,
                              border: selected ? 2 : 1,
                              borderColor: selected
                                ? 'primary.main'
                                : 'divider',
                              bgcolor: selected
                                ? 'action.selected'
                                : 'background.paper',
                              minWidth: 160,
                              transition: 'all 0.2s ease',
                              '&:hover': hasNumericProperties
                                ? {
                                    borderColor: 'primary.main',
                                    boxShadow: 2,
                                    transform: 'translateY(-2px)',
                                  }
                                : {},
                            }}
                          >
                            <Icon
                              sx={{
                                fontSize: 48,
                                color: selected
                                  ? 'primary.main'
                                  : 'text.secondary',
                                mb: 1,
                              }}
                            />
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: selected ? 600 : 400,
                                color: selected
                                  ? 'primary.main'
                                  : 'text.primary',
                              }}
                            >
                              {label}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>
                  </Box>
                )}

                {/* Step 2: Attributes */}
                {activeStep === 1 && (
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <ListAltIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Select Attributes
                      </Typography>
                    </Box>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        {`Select up to ${CHART_CONSTANTS.MAX_SLICES} numeric attributes. Use the arrow buttons to move items between lists. The order in Selected Attributes determines slice order in the chart.`}
                      </Typography>
                    </Alert>
                    <AttributesForm
                      dataColumns={currentProps.cy_dataColumns}
                      colors={currentProps.cy_colors}
                      colorScheme={currentProps.cy_colorScheme}
                      currentNetworkId={currentNetworkId}
                      onUpdate={handleAttributesUpdate}
                      hideGuidance={false}
                    />
                  </Box>
                )}

                {/* Step 3: Colors */}
                {activeStep === 2 && (
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <PaletteIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Choose Colors
                      </Typography>
                    </Box>
                    {currentProps.cy_dataColumns.length === 0 && (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                          Please go back and add attributes first.
                        </Typography>
                      </Alert>
                    )}
                    {currentProps.cy_dataColumns.length > 0 && (
                      <ColorsForm
                        dataColumns={currentProps.cy_dataColumns}
                        colors={currentProps.cy_colors}
                        colorScheme={currentProps.cy_colorScheme}
                        currentNetworkId={currentNetworkId}
                        onUpdate={handleAttributesAndColorsUpdate}
                      />
                    )}
                  </Box>
                )}

                {/* Step 4: Properties */}
                {activeStep === 3 && (
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <SettingsIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Chart Properties
                      </Typography>
                    </Box>
                    {currentProps.cy_dataColumns.length === 0 && (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                          Please go back and add attributes first.
                        </Typography>
                      </Alert>
                    )}
                    {currentProps.cy_dataColumns.length > 0 && (
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
                    )}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right Column: Preview */}
            <Box
              sx={{
                flex: '1 1 40%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                bgcolor: 'background.default',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}
                >
                  Preview
                </Typography>
                {activeStep === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 200,
                      textAlign: 'center',
                      px: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      The custom graphic will be previewed as you customize it
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <CustomGraphicPreview
                      kind={kind}
                      properties={currentProps}
                      size={200}
                      showLabels={false}
                      useGrayColors={
                        activeStep === 1 ||
                        (activeStep === 2 &&
                          !currentProps.cy_colorScheme &&
                          (currentProps.cy_colors.length === 0 ||
                            currentProps.cy_colors.some(
                              (color) => color !== COLORS.DEFAULT,
                            )))
                      }
                      showIndices={
                        activeStep === 1 || activeStep === 2 || activeStep === 3
                      }
                    />
                    {currentProps.cy_dataColumns.length === 0 &&
                      activeStep > 1 && (
                        <Alert severity="info" sx={{ mt: 3, width: '100%' }}>
                          Add at least one attribute to create a chart
                        </Alert>
                      )}
                  </>
                )}
              </Box>
            </Box>
          </Box>
        ) : (
          // Compact view for existing charts
          <Box
            sx={{
              display: 'flex',
              gap: 0,
              height: '100%',
              minHeight: 500,
            }}
          >
            {/* Left Column: All Forms */}
            <Box
              sx={{
                flex: '1 1 60%',
                overflowY: 'auto',
                borderRight: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ p: 3 }}>
                {/* Chart Type Selector */}
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <PieChartIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Chart Type
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        gap: 2,
                        mt: 2,
                      }}
                    >
                      {(
                        [
                          CustomGraphicsNameType.PieChart,
                          CustomGraphicsNameType.RingChart,
                        ] as const
                      ).map((k) => {
                        const selected = kind === k
                        const Icon =
                          k === CustomGraphicsNameType.PieChart
                            ? PieChartIcon
                            : DonutLargeIcon
                        return (
                          <Box
                            key={k}
                            onClick={() => setKind(k)}
                            sx={{
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              p: 2,
                              borderRadius: 2,
                              border: selected ? 2 : 1,
                              borderColor: selected
                                ? 'primary.main'
                                : 'grey.300',
                              bgcolor: selected
                                ? 'action.selected'
                                : 'transparent',
                              '&:hover': { opacity: 0.8 },
                              minWidth: 120,
                            }}
                          >
                            <Icon sx={{ fontSize: 40, mb: 1 }} />
                            <Typography fontSize="0.875rem">
                              {k === CustomGraphicsNameType.PieChart
                                ? 'Pie Chart'
                                : 'Donut Chart'}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Attributes Form */}
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <ListAltIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Attributes
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {currentProps.cy_dataColumns.length === 0 && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          {`Select up to ${CHART_CONSTANTS.MAX_SLICES} numeric attributes. Use the arrow buttons to move items between lists. The order in Selected Attributes determines slice order in the chart.`}
                        </Typography>
                      </Alert>
                    )}
                    <AttributesForm
                      dataColumns={currentProps.cy_dataColumns}
                      colors={currentProps.cy_colors}
                      colorScheme={currentProps.cy_colorScheme}
                      currentNetworkId={currentNetworkId}
                      onUpdate={handleAttributesUpdateCompact}
                      hideGuidance={true}
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Colors Form */}
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <PaletteIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Colors
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {currentProps.cy_dataColumns.length === 0 && (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                          Please add attributes first.
                        </Typography>
                      </Alert>
                    )}
                    {currentProps.cy_dataColumns.length > 0 && (
                      <ColorsForm
                        dataColumns={currentProps.cy_dataColumns}
                        colors={currentProps.cy_colors}
                        colorScheme={currentProps.cy_colorScheme}
                        currentNetworkId={currentNetworkId}
                        onUpdate={handleAttributesAndColorsUpdate}
                      />
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* Properties Form */}
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <SettingsIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Chart Properties
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {currentProps.cy_dataColumns.length === 0 && (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                          Please add attributes first.
                        </Typography>
                      </Alert>
                    )}
                    {currentProps.cy_dataColumns.length > 0 && (
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
                    )}
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Box>

            {/* Right Column: Preview */}
            <Box
              sx={{
                flex: '1 1 40%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                bgcolor: 'background.default',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}
                >
                  Preview
                </Typography>
                {currentProps.cy_dataColumns.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 200,
                      textAlign: 'center',
                      px: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Add attributes to see preview
                    </Typography>
                  </Box>
                ) : (
                  <CustomGraphicPreview
                    kind={kind}
                    properties={currentProps}
                    size={200}
                    showLabels={false}
                    useGrayColors={false}
                    showIndices={true}
                  />
                )}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {isNewChart ? (
          <>
            {activeStep > 0 && (
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
            )}
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepValid(activeStep)}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleConfirm}
                disabled={!isStepValid(3)}
                title={
                  !isStepValid(3)
                    ? 'Complete all required fields to confirm'
                    : 'Save chart configuration'
                }
              >
                Confirm
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!isStepValid(3)}
            title={
              !isStepValid(3)
                ? 'Complete all required fields to confirm'
                : 'Save chart configuration'
            }
          >
            Confirm
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
