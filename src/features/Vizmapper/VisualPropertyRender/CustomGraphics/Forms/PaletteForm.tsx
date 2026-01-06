import * as React from 'react'
import {
  Box,
  Typography,
  Button,
  Popover,
  Grid,
  Card,
  CardContent,
  Tooltip,
  IconButton,
  Divider,
  Tabs,
  Tab,
} from '@mui/material'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { PALETTES } from '../../../../../models/VisualStyleModel/impl/colorPalettes'
import { pickEvenly } from '../../../../../models/VisualStyleModel/impl/colorUtils'
import { StepGuidance } from '../WizardSteps/StepGuidance'
import { COLORS } from '../utils/constants'
import PaletteIcon from '@mui/icons-material/Palette'

interface PaletteFormProps {
  colorScheme: string
  colors: ColorType[]
  dataColumns: AttributeName[]
  onUpdate: (colorScheme: string, colors: ColorType[]) => void
  hideGuidance?: boolean
  anchorEl?: HTMLButtonElement | null
  open?: boolean
  onClose?: () => void
}

// Group palettes by type - calculated once at module level
const PALETTE_GROUPS = {
  Sequential: Object.keys(PALETTES).filter((key) =>
    key.startsWith('Sequential'),
  ),
  Diverging: Object.keys(PALETTES).filter((key) => key.startsWith('Diverging')),
  Viridis: Object.keys(PALETTES).filter((key) => key.startsWith('Viridis')),
} as const

export const PaletteForm: React.FC<PaletteFormProps> = ({
  colorScheme,
  colors,
  dataColumns,
  onUpdate,
  hideGuidance = false,
  anchorEl: externalAnchorEl,
  open: externalOpen,
  onClose: externalOnClose,
}) => {
  const [internalAnchorEl, setInternalAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)
  const [activeTab, setActiveTab] = React.useState(0)

  // Use external control if provided, otherwise use internal state
  const anchorEl =
    externalAnchorEl !== undefined ? externalAnchorEl : internalAnchorEl
  const open =
    externalOpen !== undefined ? externalOpen : Boolean(internalAnchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (externalAnchorEl === undefined) {
      setInternalAnchorEl(event.currentTarget)
    }
  }

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose()
    } else {
      setInternalAnchorEl(null)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  // assign colors evenly based on palette
  const handlePaletteChange = (scheme: string) => {
    const palette = PALETTES[scheme]
    const base = palette?.colors ?? []
    const newColors = pickEvenly(base, dataColumns.length) as ColorType[]
    onUpdate(scheme, newColors)
    handleClose()
  }

  const selectedPaletteName = colorScheme || 'None'

  // Get the current tab's palette keys
  const tabNames = Object.keys(PALETTE_GROUPS)
  const currentPaletteKeys = Object.values(PALETTE_GROUPS)[activeTab]

  // Render popover content
  const renderPopoverContent = () => (
    <Box
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
          Select Color Palette
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          mb: 2,
          '& .MuiTab-root': {
            fontSize: '0.8rem',
            textTransform: 'none',
            minHeight: 32,
          },
        }}
      >
        {tabNames.map((tabName, index) => (
          <Tab key={tabName} label={tabName} />
        ))}
      </Tabs>

      {/* Palette Grid */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          px: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            alignItems: 'stretch',
            width: '100%',
            maxWidth: 300,
            py: 0.5,
          }}
        >
          {currentPaletteKeys.map((paletteKey) => {
            const palette = PALETTES[paletteKey]
            if (!palette) return null
            const paletteColors = palette.colors
            return (
              <Card
                key={paletteKey}
                sx={{
                  cursor: 'pointer',
                  border:
                    colorScheme === paletteKey
                      ? `2px solid ${COLORS.PRIMARY}`
                      : `1px solid ${COLORS.BORDER}`,
                  '&:hover': {
                    borderColor: COLORS.PRIMARY,
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease',
                  width: '100%',
                  minHeight: 32,
                }}
                onClick={() => handlePaletteChange(paletteKey)}
              >
                <CardContent
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    '&:last-child': {
                      pb: 1,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: 20,
                      borderRadius: 1,
                      overflow: 'hidden',
                      gap: 0.5,
                    }}
                  >
                    {paletteColors.map((color, index) => (
                      <Tooltip key={index} title={color}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            bgcolor: color,
                            border: '1px solid',
                            borderColor: 'grey.400',
                            borderRadius: 0.5,
                            '&:hover': {
                              opacity: 0.8,
                            },
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      </Box>
    </Box>
  )

  // If controlled externally, only render the popover
  if (externalAnchorEl !== undefined) {
    return (
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            maxWidth: 500,
            width: 500,
            height: 600,
            overflow: 'hidden',
          },
        }}
      >
        {renderPopoverContent()}
      </Popover>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!hideGuidance && (
        <StepGuidance
          title="Step 2: Choose Color Palette"
          description={`Optionally Select a color palette for your ${dataColumns.length} attribute${dataColumns.length !== 1 ? 's' : ''}. The colors will be applied to each slice of your chart.`}
        />
      )}

      {/* Color Palette Selection */}
      <Typography variant="subtitle2">Color Palette</Typography>
      <Button
        variant="outlined"
        startIcon={<PaletteIcon />}
        onClick={handleClick}
        sx={{
          justifyContent: 'space-between',
          textTransform: 'none',
          minHeight: 40,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography>{selectedPaletteName}</Typography>
          {colorScheme && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {colors.slice(0, 4).map((color, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 16,
                    height: 16,
                    bgcolor: color,
                    border: '1px solid',
                    borderColor: 'grey.400',
                    borderRadius: 0.5,
                  }}
                />
              ))}
              {colors.length > 4 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  +{colors.length - 4}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Button>

      {/* Palette Selection Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            maxWidth: 500,
            width: 500,
            height: 600,
            overflow: 'hidden',
          },
        }}
      >
        {renderPopoverContent()}
      </Popover>

      {/* Show current colors preview */}
      {colors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Current Colors
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {colors.map((color, index) => (
              <Tooltip key={index} title={`${dataColumns[index]}: ${color}`}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: color,
                    border: '1px solid',
                    borderColor: 'grey.400',
                    borderRadius: 1,
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
