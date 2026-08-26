// src/features/NetworkSearch/NetworkSearchProviderIcon.tsx
//
// Fixed-size icon for a network search provider. Renders the provider's
// registered image when it has one; otherwise (or when the image fails to
// load) MUI's Avatar falls back to the children — the provider's initial on
// a color derived deterministically from its resource id, so every provider
// keeps a stable, distinguishable mark.

import { Avatar } from '@mui/material'

import type { NetworkSearchProvider } from './useNetworkSearchProviders'

/** Deterministic hue from a string, for the fallback avatar background. */
function colorFromId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue}, 45%, 50%)`
}

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
      bgcolor: colorFromId(provider.resourceId),
    }}
  >
    {provider.name.charAt(0).toUpperCase()}
  </Avatar>
)
