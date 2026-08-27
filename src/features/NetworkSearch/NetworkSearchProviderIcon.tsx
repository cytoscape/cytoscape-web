// src/features/NetworkSearch/NetworkSearchProviderIcon.tsx
//
// Fixed-size icon for a network search provider. Renders the provider's
// registered image when it has one; otherwise (or when the image fails to
// load) MUI's Avatar falls back to the children — the provider's initial on
// a white tile, so every provider keeps a stable, distinguishable mark.

import { Avatar } from '@mui/material'

import type { NetworkSearchProvider } from './useNetworkSearchProviders'

interface NetworkSearchProviderIconProps {
  provider: NetworkSearchProvider
  size?: number
}

export const NetworkSearchProviderIcon = ({
  provider,
  size = 26,
}: NetworkSearchProviderIconProps): JSX.Element => (
  <Avatar
    variant="rounded"
    src={provider.icon}
    alt={provider.name}
    sx={{
      width: size,
      height: size,
      fontSize: size * 0.55,
      bgcolor: (theme) => theme.palette.common.white,
      // Avatar's default text color is near-white; the fallback initial
      // needs an explicit color to stay visible on the white tile.
      color: (theme) => theme.palette.text.secondary,
    }}
  >
    {provider.name.charAt(0).toUpperCase()}
  </Avatar>
)
