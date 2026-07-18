import { Chip, Tooltip, Typography } from '@mui/material'

import { ValueTypeName } from '../models/TableModel/ValueTypeName'
import {
  dataTypeAbbreviation,
  dataTypeChipColor,
  dataTypeDescription,
  dataTypeLabel,
} from '../models/TableModel/impl/dataTypeDisplay'

export type DataTypeChipVariant = 'chip' | 'text' | 'abbreviation'

interface DataTypeChipProps {
  type: ValueTypeName
  /**
   * `chip` (default): colored MUI Chip with the readable label.
   * `text`: plain typography with the readable label.
   * `abbreviation`: plain typography with the compact abbreviation.
   */
  variant?: DataTypeChipVariant
  /** Wrap in a tooltip showing the type description. Default true. */
  showTooltip?: boolean
  size?: 'small' | 'medium'
}

/**
 * Reusable, consistent renderer for a column/attribute data type (CW-562).
 *
 * All wording and coloring come from the single source of truth in
 * `models/TableModel/impl/dataTypeDisplay`, so every surface (dropdowns,
 * dialogs, chips) shows the same thing.
 */
export const DataTypeChip = ({
  type,
  variant = 'chip',
  showTooltip = true,
  size = 'small',
}: DataTypeChipProps): JSX.Element => {
  const label = dataTypeLabel(type)
  const description = dataTypeDescription(type)

  let content: JSX.Element
  if (variant === 'chip') {
    content = (
      <Chip
        label={label}
        color={dataTypeChipColor(type)}
        size={size}
        variant="outlined"
        data-testid={`data-type-chip-${type}`}
      />
    )
  } else if (variant === 'abbreviation') {
    content = (
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        data-testid={`data-type-abbrev-${type}`}
      >
        {dataTypeAbbreviation(type)}
      </Typography>
    )
  } else {
    content = (
      <Typography
        component="span"
        variant="body2"
        data-testid={`data-type-text-${type}`}
      >
        {label}
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

export default DataTypeChip
