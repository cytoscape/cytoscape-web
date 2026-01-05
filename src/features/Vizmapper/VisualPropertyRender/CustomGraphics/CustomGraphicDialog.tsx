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
  Divider,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import PieChartIcon from '@mui/icons-material/PieChart'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import ListAltIcon from '@mui/icons-material/ListAlt'
import SettingsIcon from '@mui/icons-material/Settings'
import { IdType } from '../../../../models/IdType'
import { CustomGraphicsType } from '../../../../models/VisualStyleModel'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../../models/VisualStyleModel/impl/defaultVisualStyle'
import { CustomGraphicsNameType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

import { CustomGraphicPreview } from './WizardSteps/CustomGraphicPreview'
import { AttributesAndColorsForm } from './Forms/AttributesAndColorsForm'
import { PropertiesForm } from './Forms/PropertiesForm'
import { useCustomGraphicState } from './hooks/useCustomGraphicState'
import { COLORS } from './utils/constants'
import { isRingChartProperties } from './utils/typeGuards'
import { CustomGraphicKind } from './WizardSteps/SelectTypeStep'

/** Props for the custom graphics dialog */
interface CustomGraphicDialogProps {
  open: boolean
  initialValue: CustomGraphicsType | null
  currentNetworkId: IdType
  onCancel: () => void
  onConfirm: (value: CustomGraphicsType) => void
}

/**
 * Single-page custom graphics dialog with two-column layout
 * Follows UX principles: immediate feedback, visual hierarchy
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

  // Determine if this is a new chart or editing existing
  const isNewChart =
    !initialValue || initialValue.name === CustomGraphicsNameType.None

  // Handler to remove graphics and reset to defaults
  const handleRemoveChartsClick = () => {
    const defaultGraphics = handleRemoveCharts()
    onConfirm(defaultGraphics)
  }

  // Check if form is valid for confirmation
  const isValid = currentProps.cy_dataColumns.length > 0

  const handleConfirm = () => {
    if (!isValid) return
    onConfirm({
      ...DEFAULT_CUSTOM_GRAPHICS,
      type: 'chart',
      name: kind,
      properties: currentProps,
    } as CustomGraphicsType)
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
        <IconButton
          size="small"
          onClick={handleRemoveChartsClick}
          disabled={isNewChart}
          sx={{
            color: COLORS.REMOVE,
            '&:hover': {
              backgroundColor: COLORS.REMOVE,
              color: '#FFFFFF',
            },
            '&:disabled': {
              opacity: 0.5,
            },
          }}
          title="Remove chart"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 0,
            height: '100%',
            minHeight: 500,
          }}
        >
          {/* Left Column: Form Sections */}
          <Box
            sx={{
              flex: '1 1 60%',
              overflowY: 'auto',
              borderRight: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ p: 3 }}>
              {/* Chart Type Selection */}
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PieChartIcon color="primary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Chart Type
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
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
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 1,
                            border: selected ? 2 : 1,
                            borderColor: selected ? 'primary.main' : 'divider',
                            bgcolor: selected
                              ? 'action.selected'
                              : 'background.paper',
                            transition: 'all 0.2s ease',
                            '&:hover': hasNumericProperties
                              ? {
                                  borderColor: 'primary.main',
                                  bgcolor: 'action.hover',
                                }
                              : {},
                            opacity: hasNumericProperties ? 1 : 0.5,
                          }}
                        >
                          <Icon
                            sx={{
                              fontSize: 18,
                              color: selected
                                ? 'primary.main'
                                : 'text.secondary',
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: selected ? 600 : 400,
                              color: selected ? 'primary.main' : 'text.primary',
                            }}
                          >
                            {label}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
                <Box sx={{ pl: 4 }}>
                  {!hasNumericProperties && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        This network does not have any numeric properties in the
                        node table. Custom graphics require numeric data to
                        display values.
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Attributes & Colors */}
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <ListAltIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Attributes & Colors
                  </Typography>
                </Box>
                <Box sx={{ pl: 4 }}>
                  {!hasNumericProperties && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Select numeric attributes from your node table to
                        visualize in the chart.
                      </Typography>
                    </Alert>
                  )}
                  <AttributesAndColorsForm
                    dataColumns={currentProps.cy_dataColumns}
                    colors={currentProps.cy_colors}
                    colorScheme={currentProps.cy_colorScheme}
                    currentNetworkId={currentNetworkId}
                    onUpdate={handleAttributesAndColorsUpdate}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Properties */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <SettingsIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Chart Properties
                  </Typography>
                </Box>
                <Box sx={{ pl: 4 }}>
                  {currentProps.cy_dataColumns.length === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Add attributes above to configure chart properties.
                      </Typography>
                    </Alert>
                  )}
                  <Box
                    sx={{
                      opacity:
                        currentProps.cy_dataColumns.length === 0 ? 0.5 : 1,
                      pointerEvents:
                        currentProps.cy_dataColumns.length === 0
                          ? 'none'
                          : 'auto',
                    }}
                  >
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
                </Box>
              </Box>
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
              <CustomGraphicPreview
                kind={kind}
                properties={currentProps}
                size={200}
                showLabels={true}
              />
              {!isValid && (
                <Alert severity="info" sx={{ mt: 3, width: '100%' }}>
                  Add at least one attribute to create a chart
                </Alert>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!isValid}
          title={
            !isValid
              ? 'Add at least one attribute to create a chart'
              : 'Save chart configuration'
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  )
}
