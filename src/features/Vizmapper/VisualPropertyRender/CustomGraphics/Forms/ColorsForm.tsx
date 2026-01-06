import * as React from 'react'
import {
  Box,
  Typography,
  Button,
} from '@mui/material'
import PaletteIcon from '@mui/icons-material/Palette'
import { IdType } from '../../../../../models/IdType'
import { AttributeName } from '../../../../../models/TableModel/AttributeName'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { COLORS } from '../utils/constants'
import { PaletteForm } from './PaletteForm'
import { CustomColorsForm } from './CustomColorsForm'

interface ColorsFormProps {
  dataColumns: AttributeName[]
  colors: ColorType[]
  colorScheme: string
  currentNetworkId?: IdType
  onUpdate: (
    dataColumns: AttributeName[],
    colors: ColorType[],
    colorScheme: string,
  ) => void
}

export const ColorsForm: React.FC<ColorsFormProps> = ({
  dataColumns,
  colors,
  colorScheme,
  currentNetworkId,
  onUpdate,
}) => {

  // State for palette picker popover
  const [paletteAnchorEl, setPaletteAnchorEl] =
    React.useState<HTMLButtonElement | null>(null)
  const paletteOpen = Boolean(paletteAnchorEl)

  // Handle opening palette picker
  const handleOpenPalettePicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPaletteAnchorEl(event.currentTarget)
  }

  // Handle palette selection - apply palette colors to table
  const handlePaletteUpdate = (scheme: string, newColors: ColorType[]) => {
    onUpdate(dataColumns, newColors, scheme)
    setPaletteAnchorEl(null)
  }

  // Handle custom color updates
  const handleCustomUpdate = (
    newDataColumns: AttributeName[],
    newColors: ColorType[],
  ) => {
    // Preserve colorScheme when customizing (allows users to customize palette colors)
    onUpdate(newDataColumns, newColors, colorScheme)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Palette Selection Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<PaletteIcon />}
          onClick={handleOpenPalettePicker}
          sx={{ textTransform: 'none' }}
        >
          {colorScheme ? `Palette: ${colorScheme}` : 'Select Color Palette'}
        </Button>
      </Box>

      {/* Always show the attributes/colors table */}
      <CustomColorsForm
        dataColumns={dataColumns}
        colors={colors}
        currentNetworkId={currentNetworkId}
        onUpdate={handleCustomUpdate}
      />

      {/* Palette Selection Popover */}
      <PaletteForm
        colorScheme={colorScheme}
        colors={colors}
        dataColumns={dataColumns}
        onUpdate={handlePaletteUpdate}
        hideGuidance={true}
        anchorEl={paletteAnchorEl}
        open={paletteOpen}
        onClose={() => setPaletteAnchorEl(null)}
      />
    </Box>
  )
}

