import { Chip, Typography } from '@mui/material'
import type { ReactElement } from 'react'

/**
 * The NDEx / Local label in front of a network's name in the workspace list.
 * The manual draws it too (UiIcon), so the label it shows stays the app's.
 */
export const NetworkSourceChip = ({
  isNdex,
}: {
  isNdex: boolean
}): ReactElement => (
  <Chip
    color={isNdex ? 'primary' : 'success'}
    size="small"
    sx={{ opacity: 0.8 }}
    label={
      <Typography sx={{ fontSize: 10 }} variant="caption">
        {isNdex ? 'NDEx' : 'Local'}
      </Typography>
    }
  />
)
