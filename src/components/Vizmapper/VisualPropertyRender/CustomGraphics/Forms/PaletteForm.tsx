import * as React from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
} from '@mui/material'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { PALETTES } from '../utils/palettes'
import { pickEvenly } from '../utils/colorUtils'
import { StepGuidance } from '../WizardSteps/StepGuidance'

interface PaletteFormProps {
  colorScheme: string
  colors: ColorType[]
  dataColumns: AttributeName[]
  onUpdate: (colorScheme: string, colors: ColorType[]) => void
  hideGuidance?: boolean
}

export const PaletteForm: React.FC<PaletteFormProps> = ({
  colorScheme,
  colors,
  dataColumns,
  onUpdate,
  hideGuidance = false,
}) => {
  // assign colors evenly based on palette
  const handlePaletteChange = (scheme: string) => {
    const base = PALETTES[scheme] ?? []
    const newColors = pickEvenly(base, dataColumns.length) as ColorType[]

    onUpdate(scheme, newColors)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!hideGuidance && (
        <StepGuidance
          title="Step 2: Choose Color Palette"
          description={`Optionally Select a color palette for your ${dataColumns.length} attribute${dataColumns.length !== 1 ? 's' : ''}. The colors will be applied to each slice of your chart.`}
        />
      )}

      {/* Color Palette dropdown */}
      <Typography variant="subtitle2">Color Palette</Typography>
      <FormControl size="small">
        <InputLabel id="palette-label">Palette</InputLabel>
        <Select
          labelId="palette-label"
          value={colorScheme}
          label="Palette"
          onChange={(e: SelectChangeEvent<string>) =>
            handlePaletteChange(e.target.value)
          }
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {Object.entries(PALETTES).map(([name, colors]) => (
            <MenuItem key={name} value={name}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Typography variant="body2">{name}</Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    flexWrap: 'nowrap',
                    ml: 2,
                  }}
                >
                  {colors.map((col) => (
                    <Tooltip key={col} title={col}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: col,
                          border: '1px solid',
                          borderColor: 'grey.400',
                          borderRadius: 0.5,
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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
