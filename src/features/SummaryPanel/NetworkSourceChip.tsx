import { Chip, Typography } from '@mui/material'
import type { ChipProps } from '@mui/material'
import { forwardRef } from 'react'

/**
 * The NDEx / Local label in front of a network's name in the workspace list.
 * The manual draws it too (UiIcon), so the label it shows stays the app's.
 */
export const NetworkSourceChip = forwardRef<
  HTMLDivElement,
  { isNdex: boolean } & Omit<ChipProps, 'color' | 'label'>
>(({ isNdex, ...rest }, ref) => (
  <Chip
    ref={ref}
    {...rest}
    color={isNdex ? 'primary' : 'success'}
    size="small"
    sx={{ opacity: 0.8, ...rest.sx }}
    label={
      <Typography sx={{ fontSize: 10 }} variant="caption">
        {isNdex ? 'NDEx' : 'Local'}
      </Typography>
    }
  />
))
