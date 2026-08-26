// src/features/NetworkSearch/NetworkSearchProviderMenu.tsx
//
// Anchored provider selector for the network search bar. This is a plain
// menu, not a modal editor, so click-away dismissal is correct here (see
// docs/specifications/DIALOG_DISMISS_POLICY.md, "out of scope" clause).

import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'

import { NetworkSearchProviderIcon } from './NetworkSearchProviderIcon'
import type { NetworkSearchProvider } from './useNetworkSearchProviders'

interface NetworkSearchProviderMenuProps {
  anchorEl: HTMLElement | null
  open: boolean
  providers: NetworkSearchProvider[]
  selected: NetworkSearchProvider | null
  onSelect: (provider: NetworkSearchProvider) => void
  onClose: () => void
}

export const NetworkSearchProviderMenu = ({
  anchorEl,
  open,
  providers,
  selected,
  onSelect,
  onClose,
}: NetworkSearchProviderMenuProps): JSX.Element => (
  <Menu
    data-testid="network-search-provider-menu"
    anchorEl={anchorEl}
    open={open}
    onClose={onClose}
  >
    {providers.map((provider) => (
      <Tooltip
        key={provider.resourceId}
        title={provider.description ?? ''}
        placement="right"
      >
        <MenuItem
          data-testid={`network-search-provider-item-${provider.appId}-${provider.id}`}
          selected={provider.resourceId === selected?.resourceId}
          onClick={() => {
            onSelect(provider)
            onClose()
          }}
        >
          <ListItemIcon>
            <NetworkSearchProviderIcon provider={provider} />
          </ListItemIcon>
          <ListItemText sx={{ pr: 1 }}>{provider.name}</ListItemText>
          {provider.website !== undefined && (
            <Tooltip title="Visit Website...">
              <IconButton
                data-testid={`network-search-provider-website-${provider.appId}-${provider.id}`}
                size="small"
                edge="end"
                onClick={(e) => {
                  // The website link must not change the selected provider.
                  e.stopPropagation()
                  window.open(provider.website, '_blank', 'noopener,noreferrer')
                }}
                sx={{ color: (theme) => theme.palette.primary.main }}
              >
                <OpenInNewIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}
        </MenuItem>
      </Tooltip>
    ))}
  </Menu>
)
