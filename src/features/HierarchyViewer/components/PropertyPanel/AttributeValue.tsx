import { Box, Link } from '@mui/material'
import { Fragment } from 'react'

import { ValueType } from '../../../../models/TableModel'
import { getValueDisplayItems } from '../../utils/attributeValueDisplay'

// Shown in place of a missing value: null, an absent column, a blank string,
// or an empty list
export const NO_VALUE_LABEL = 'N/A'

interface AttributeValueProps {
  value: ValueType | null | undefined
}

/**
 * The placeholder for a missing value, muted and italic so it cannot be
 * mistaken for a literal "N/A" string.
 */
export const NoValueLabel = () => (
  <Box
    component="span"
    data-testid="attribute-value-empty"
    title="No value"
    sx={{
      color: (theme) => theme.palette.text.disabled,
      fontStyle: 'italic',
    }}
  >
    {NO_VALUE_LABEL}
  </Box>
)

/**
 * Renders a table cell value for reading: list items separated by ", ",
 * URLs and known identifiers as links opening in a new tab, and a muted
 * placeholder when there is no value.
 */
export const AttributeValue = ({ value }: AttributeValueProps) => {
  const items = getValueDisplayItems(value)

  if (items.length === 0) {
    return <NoValueLabel />
  }

  return (
    <Box component="span" sx={{ overflowWrap: 'anywhere' }}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && ', '}
          {item.href === undefined ? (
            item.text
          ) : (
            <Link href={item.href} target="_blank" rel="noopener noreferrer">
              {item.text}
            </Link>
          )}
        </Fragment>
      ))}
    </Box>
  )
}
