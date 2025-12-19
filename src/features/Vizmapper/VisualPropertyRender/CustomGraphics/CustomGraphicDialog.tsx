import * as React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Alert,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
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
 * Single-page custom graphics dialog with collapsible sections
 * Follows UX principles: progressive disclosure, immediate feedback, visual hierarchy
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

  // Accordion expansion state
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    () => {
      // For new charts, expand type selection; for editing, keep all collapsed
      return isNewChart ? new Set(['type']) : new Set()
    },
  )

  const handleSectionChange = (section: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (isExpanded) {
        next.add(section)
      } else {
        next.delete(section)
      }
      return next
    })
  }

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
      maxWidth="md"
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
        {/* Sticky Preview - Always Visible */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            p: 3,
            mb: 0,
          }}
        >
          <CustomGraphicPreview
            kind={kind}
            properties={currentProps}
            size={100}
            showLabels={true}
          />
          {!isValid && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Add at least one attribute to create a chart
            </Alert>
          )}
        </Box>

        {/* Collapsible Sections */}
        <Box sx={{ p: 3, pt: 2 }}>
          {/* Chart Type Selection */}
          <Accordion
            expanded={expandedSections.has('type')}
            onChange={handleSectionChange('type')}
            sx={{ mb: 2, boxShadow: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  width: '100%',
                }}
              >
                <PieChartIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Chart Type
                </Typography>
                <Box sx={{ ml: 'auto', mr: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {kind === CustomGraphicsNameType.PieChart
                      ? 'Pie Chart'
                      : 'Donut Chart'}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {!hasNumericProperties && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    This network does not have any numeric properties in the node
                    table. Custom graphics require numeric data to display
                    values.
                  </Typography>
                </Alert>
              )}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 3,
                  py: 2,
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
                        p: 2,
                        borderRadius: 2,
                        border: selected ? 2 : 1,
                        borderColor: selected ? 'primary.main' : 'divider',
                        bgcolor: selected
                          ? 'action.selected'
                          : 'background.paper',
                        minWidth: 140,
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
                          color: selected ? 'primary.main' : 'text.secondary',
                          mb: 1,
                        }}
                      />
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: selected ? 600 : 400,
                          color: selected ? 'primary.main' : 'text.primary',
                        }}
                      >
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

          {/* Attributes & Colors */}
          <Accordion
            expanded={expandedSections.has('attributes')}
            onChange={handleSectionChange('attributes')}
            disabled={!hasNumericProperties}
            sx={{ mb: 2, boxShadow: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  width: '100%',
                }}
              >
                <ListAltIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Attributes & Colors
                </Typography>
                <Box sx={{ ml: 'auto', mr: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {currentProps.cy_dataColumns.length > 0
                      ? `${currentProps.cy_dataColumns.length} attribute${
                          currentProps.cy_dataColumns.length !== 1 ? 's' : ''
                        }`
                      : 'No attributes'}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <AttributesAndColorsForm
                dataColumns={currentProps.cy_dataColumns}
                colors={currentProps.cy_colors}
                colorScheme={currentProps.cy_colorScheme}
                currentNetworkId={currentNetworkId}
                onUpdate={handleAttributesAndColorsUpdate}
              />
            </AccordionDetails>
          </Accordion>

          {/* Properties */}
          <Accordion
            expanded={expandedSections.has('properties')}
            onChange={handleSectionChange('properties')}
            disabled={currentProps.cy_dataColumns.length === 0}
            sx={{ boxShadow: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  width: '100%',
                }}
              >
                <SettingsIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Chart Properties
                </Typography>
                <Box sx={{ ml: 'auto', mr: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {currentProps.cy_startAngle}° start angle
                    {kind === CustomGraphicsNameType.RingChart &&
                      isRingChartProperties(currentProps) &&
                      ` • ${((currentProps.cy_holeSize ?? 0.4) * 100).toFixed(0)}% hole`}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
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
            </AccordionDetails>
          </Accordion>
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
