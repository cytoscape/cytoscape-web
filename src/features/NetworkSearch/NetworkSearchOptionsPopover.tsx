// src/features/NetworkSearch/NetworkSearchOptionsPopover.tsx
//
// The "More Options" popup for the selected network search provider. An
// anchored, non-modal surface: backdrop click and Escape dismiss it (the
// out-of-scope class in docs/specifications/DIALOG_DISMISS_POLICY.md), and
// the host-rendered header additionally carries a Close button so every
// app's options panel has an explicit exit without providing one.

import CloseIcon from '@mui/icons-material/Close'
import { Box, IconButton, Popover, Tooltip, Typography } from '@mui/material'
import { Suspense } from 'react'

import { AppIdProvider } from '../../app-api/AppIdContext'
import { buildPerAppApis } from '../../app-api/core/perAppApis'
import type { NetworkSearchOptionsHostProps } from '../../app-api/types/AppResourceTypes'
import { PluginErrorBoundary } from '../AppManager/PluginErrorBoundary'
import type { NetworkSearchProvider } from './useNetworkSearchProviders'

interface NetworkSearchOptionsPopoverProps {
  anchorEl: HTMLElement | null
  open: boolean
  provider: NetworkSearchProvider
  onClose: () => void
}

export const NetworkSearchOptionsPopover = ({
  anchorEl,
  open,
  provider,
  onClose,
}: NetworkSearchOptionsPopoverProps): JSX.Element | null => {
  const OptionsComponent = provider.optionsComponent
  if (OptionsComponent === undefined) {
    return null
  }

  const hostProps: NetworkSearchOptionsHostProps = { requestClose: onClose }

  return (
    <Popover
      data-testid="network-search-options-popover"
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box sx={{ minWidth: 260, maxWidth: 420 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pl: 2,
            pr: 0.5,
            py: 0.5,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="subtitle2">
            {provider.name} — More Options
          </Typography>
          <Tooltip title="Close">
            <IconButton
              data-testid="network-search-options-close-button"
              aria-label="Close"
              size="small"
              onClick={onClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ p: 1 }}>
          <AppIdProvider
            value={{
              appId: provider.appId,
              apis: buildPerAppApis(provider.appId),
            }}
          >
            <PluginErrorBoundary
              appId={provider.appId}
              slot="search-bar"
              customFallback={provider.errorFallback as any}
            >
              <Suspense>
                <OptionsComponent {...hostProps} />
              </Suspense>
            </PluginErrorBoundary>
          </AppIdProvider>
        </Box>
      </Box>
    </Popover>
  )
}
