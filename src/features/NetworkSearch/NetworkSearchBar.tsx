// src/features/NetworkSearch/NetworkSearchBar.tsx
//
// The network search bar at the top of the Workspace tab. Renders nothing
// until at least one active app has registered a 'search-bar' provider.
// The host owns the query input; the selected provider contributes its
// placeholder, an optional "More Options" panel, and the submit handler.

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import {
  Box,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material'
import { useState } from 'react'

import { useMessageStore } from '../../data/hooks/stores/MessageStore'
import { logApp } from '../../debug'
import { MessageSeverity } from '../../models/MessageModel'
import { NetworkSearchOptionsPopover } from './NetworkSearchOptionsPopover'
import { NetworkSearchProviderIcon } from './NetworkSearchProviderIcon'
import { NetworkSearchProviderMenu } from './NetworkSearchProviderMenu'
import {
  NetworkSearchProvider,
  useNetworkSearchProviders,
} from './useNetworkSearchProviders'

const DEFAULT_PLACEHOLDER = 'Type your query here...'
const SEARCH_ERROR_DURATION_MS = 5000

export const NetworkSearchBar = (): JSX.Element | null => {
  const { providers, selected, selectProvider } = useNetworkSearchProviders()
  const addMessage = useMessageStore((state) => state.addMessage)

  const [query, setQuery] = useState<string>('')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [providerMenuAnchor, setProviderMenuAnchor] =
    useState<HTMLElement | null>(null)
  const [optionsAnchor, setOptionsAnchor] = useState<HTMLElement | null>(null)

  if (providers.length === 0) {
    return null
  }

  const trimmedQuery = query.trim()
  const canSearch = selected !== null && trimmedQuery !== '' && !isRunning

  const handleSubmit = async (): Promise<void> => {
    if (selected === null || trimmedQuery === '' || isRunning) {
      return
    }
    setIsRunning(true)
    try {
      await Promise.resolve(selected.onSubmit({ query: trimmedQuery }))
    } catch (e) {
      logApp.warn(
        `[NetworkSearchBar]: provider '${selected.resourceId}' failed to run the search:`,
        e,
      )
      addMessage({
        message: `Network search "${selected.name}" failed.`,
        duration: SEARCH_ERROR_DURATION_MS,
        severity: MessageSeverity.ERROR,
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleSelectProvider = (provider: NetworkSearchProvider): void => {
    selectProvider(provider)
    // The options panel belongs to the previous provider — never leave it
    // open across a switch.
    setOptionsAnchor(null)
  }

  return (
    <Box
      data-testid="network-search-bar"
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: 0.25,
        px: 0.5,
        py: 0.25,
        backgroundColor: (theme) => theme.palette.background.paper,
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Tooltip
        title={
          selected !== null
            ? `${selected.name} — click to select a search provider`
            : 'Click to select a search provider...'
        }
      >
        <IconButton
          data-testid="network-search-provider-button"
          size="small"
          onClick={(e) => setProviderMenuAnchor(e.currentTarget)}
          sx={{ borderRadius: 1, px: 0.25, color: (theme) => theme.palette.text.primary }}
        >
          {selected !== null && <NetworkSearchProviderIcon provider={selected} />}
          <ArrowDropDownIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <TextField
        size="small"
        fullWidth
        value={query}
        placeholder={selected?.placeholder ?? DEFAULT_PLACEHOLDER}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            void handleSubmit()
          }
        }}
        inputProps={{
          'data-testid': 'network-search-input',
          'aria-label': 'Network search query',
        }}
      />

      {selected?.optionsComponent !== undefined && (
        <Tooltip title="More Options...">
          <IconButton
            data-testid="network-search-options-button"
            size="small"
            onClick={(e) =>
              setOptionsAnchor(optionsAnchor === null ? e.currentTarget : null)
            }
            sx={{ color: (theme) => theme.palette.text.primary }}
          >
            <TuneIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Search Network">
        {/* span keeps the tooltip alive while the button is disabled */}
        <span>
          <IconButton
            data-testid="network-search-submit-button"
            size="small"
            disabled={!canSearch}
            onClick={() => void handleSubmit()}
            sx={{ color: (theme) => theme.palette.text.primary }}
          >
            {isRunning ? (
              <CircularProgress size={18} />
            ) : (
              <SearchIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>

      <NetworkSearchProviderMenu
        anchorEl={providerMenuAnchor}
        open={providerMenuAnchor !== null}
        providers={providers}
        selected={selected}
        onSelect={handleSelectProvider}
        onClose={() => setProviderMenuAnchor(null)}
      />

      {selected !== null && (
        <NetworkSearchOptionsPopover
          anchorEl={optionsAnchor}
          open={optionsAnchor !== null}
          provider={selected}
          onClose={() => setOptionsAnchor(null)}
        />
      )}
    </Box>
  )
}
