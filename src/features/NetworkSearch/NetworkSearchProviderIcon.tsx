// src/features/NetworkSearch/NetworkSearchProviderIcon.tsx
//
// Fixed-size icon for a network search provider, following the same rule as
// an 'apps-menu' icon: an SVG is painted in the surrounding text color
// (UriIcon), so it follows the light/dark theme with no effort from the app;
// a raster logo keeps its colors and sits on a white tile so it stays
// visible in dark mode. Without an image (or when a raster image fails to
// load) MUI's Avatar falls back to the provider's initial on that tile, so
// every provider keeps a stable, distinguishable mark.

import { Avatar } from '@mui/material'

import { isSvgIconUri, UriIcon } from '@/components/UriIcon'
import type { NetworkSearchProvider } from './useNetworkSearchProviders'

interface NetworkSearchProviderIconProps {
  provider: NetworkSearchProvider
  size?: number
}

export const NetworkSearchProviderIcon = ({
  provider,
  size = 26,
}: NetworkSearchProviderIconProps): JSX.Element =>
  provider.icon !== undefined && isSvgIconUri(provider.icon) ? (
    <UriIcon
      src={provider.icon}
      size={size}
      label={provider.name}
      data-testid="network-search-provider-icon"
    />
  ) : (
    <Avatar
      variant="rounded"
      src={provider.icon}
      alt={provider.name}
      data-testid="network-search-provider-icon"
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        bgcolor: (theme) => theme.palette.common.white,
        // Avatar's default text color is near-white; the fallback initial
        // needs an explicit color to stay visible on the white tile.
        color: (theme) =>
          theme.palette.getContrastText(theme.palette.common.white),
        // Avatar crops (object-fit: cover) by default; provider logos come in
        // arbitrary aspect ratios and must be letterboxed, not cropped.
        '& img': { objectFit: 'contain' },
      }}
    >
      {provider.name.charAt(0).toUpperCase()}
    </Avatar>
  )
