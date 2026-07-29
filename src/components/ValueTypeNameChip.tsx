import { Box, Tooltip, Typography, useTheme } from '@mui/material'

import { ValueTypeName } from '../models/TableModel/ValueTypeName'
import { valueTypeNameDescription, valueTypeNameLabel } from '../models/TableModel/impl/valueTypeNameDisplay'
import { getValueTypeNameSVG } from '../models/TableModel/impl/valueTypeNameIcons'

export type ValueTypeNameChipVariant = 'chip' | 'text' | 'abbreviation' | 'chip-and-text'

interface ValueTypeNameChipProps {
  type: ValueTypeName
  /**
   * `chip` (default): SVG badge showing the compact abbreviation and colors.
   * `text`: plain typography with the readable label.
   * `abbreviation`: plain typography with the compact abbreviation.
   */
  variant?: ValueTypeNameChipVariant
  /** Wrap in a tooltip showing the type description. Default true. */
  showTooltip?: boolean
  size?: 'small' | 'medium'
  /**
   * Force the badge palette instead of following the app theme. Needed on
   * surfaces whose background does not track the theme mode, such as the
   * always-dark MUI tooltip.
   */
  colorScheme?: 'light' | 'dark'
}

/**
 * Reusable, consistent renderer for a column/attribute data type (CW-562).
 */
export const ValueTypeNameChip = ({
  type,
  variant = 'chip',
  showTooltip = true,
  colorScheme,
}: ValueTypeNameChipProps): JSX.Element => {
  const description = valueTypeNameDescription(type)
  const theme = useTheme()
  const isDark =
    colorScheme !== undefined
      ? colorScheme === 'dark'
      : theme.palette.mode === 'dark'

  let content: JSX.Element
  if (variant === 'chip' || variant === 'abbreviation' || variant === 'chip-and-text') {
    const svgString = getValueTypeNameSVG(type, isDark)
    const chip = (
      <Box
        component="span"
        data-testid={`data-type-chip-${type}`}
        dangerouslySetInnerHTML={{ __html: svgString }}
        sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: 24, 
          overflow: 'hidden', 
          verticalAlign: 'middle' 
        }}
      />
    )
    if (variant === 'chip-and-text') {
      content = (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          {chip}
          <Typography
            component="span"
            variant="body2"
            data-testid={`data-type-text-${type}`}
          >
            {valueTypeNameLabel(type)}
          </Typography>
        </Box>
      )
    } else {
      content = chip
    }
  } else {
    content = (
      <Typography
        component="span"
        variant="body2"
        data-testid={`data-type-text-${type}`}
      >
        {valueTypeNameLabel(type)}
      </Typography>
    )
  }

  if (!showTooltip) {
    return content
  }

  return (
    <Tooltip title={description} arrow>
      {content}
    </Tooltip>
  )
}

export default ValueTypeNameChip

