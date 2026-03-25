import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { useAppStore } from '../../data/hooks/stores/AppStore'
import { AppCatalogEntry } from '../../models/AppModel/AppCatalogEntry'
import { AppLoadState } from '../../models/AppModel/AppLoadState'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { CyApp } from '../../models/AppModel/CyApp'
import { useAppManagerCommands } from './AppManagerCommandsContext'

/**
 * Merged view of a catalog entry with its runtime state.
 */
interface AppDisplayEntry {
  id: string
  name: string
  description?: string
  version?: string
  author?: string
  inCatalog: boolean
  loadState: AppLoadState | undefined
  status: AppStatus | undefined
}

/**
 * Determine the primary action for an app based on its catalog/load/status.
 */
function getAction(
  entry: AppDisplayEntry,
): 'enable' | 'disable' | 'retry' | 'loading' | 'remove' | 'none' {
  if (entry.inCatalog) {
    if (entry.loadState === 'loading') return 'loading'
    if (entry.loadState === 'failed') return 'retry'
    if (entry.loadState === 'loaded' && entry.status === AppStatus.Active)
      return 'disable'
    // unloaded or loaded+inactive → enable
    return 'enable'
  }

  // Orphan (not in catalog)
  if (entry.loadState === 'failed') return 'none'
  if (entry.status === AppStatus.Active) return 'disable'
  if (entry.status === AppStatus.Inactive) return 'remove'
  return 'none'
}

export const AppListPanel = () => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const catalog: Record<string, AppCatalogEntry> = useAppStore(
    (state) => state.catalog,
  )
  const loadStates: Record<string, AppLoadState> = useAppStore(
    (state) => state.loadStates,
  )
  const {
    activateApp,
    deactivateApp,
    retryApp,
    refreshCatalog,
    removeOrphan,
  } = useAppManagerCommands()

  const [refreshing, setRefreshing] = useState(false)

  // Build merged display list: catalog entries + orphan apps
  const displayEntries: AppDisplayEntry[] = []
  const seenIds = new Set<string>()

  // 1. All catalog entries
  for (const entry of Object.values(catalog)) {
    seenIds.add(entry.id)
    const app = apps[entry.id]
    displayEntries.push({
      id: entry.id,
      name: entry.name ?? entry.id,
      description: entry.description ?? app?.description,
      version: entry.version ?? app?.version,
      author: entry.author,
      inCatalog: true,
      loadState: loadStates[entry.id],
      status: app?.status,
    })
  }

  // 2. Orphan apps (in apps store but not in catalog)
  for (const [id, app] of Object.entries(apps)) {
    if (seenIds.has(id)) continue
    // Skip failed orphans (not displayable per spec)
    if (loadStates[id] === 'failed') continue
    displayEntries.push({
      id,
      name: app.name ?? id,
      description: app.description,
      version: app.version,
      author: undefined,
      inCatalog: false,
      loadState: loadStates[id],
      status: app.status,
    })
  }

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      await refreshCatalog()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Available Apps
        </Typography>
        <Tooltip title="Refresh catalog">
          <span>
            <IconButton
              size="small"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
            >
              {refreshing ? (
                <CircularProgress size={18} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {displayEntries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No apps available in catalog.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {displayEntries.map((entry) => {
            const action = getAction(entry)
            const isActive =
              entry.loadState === 'loaded' &&
              entry.status === AppStatus.Active
            return (
              <Paper
                key={entry.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderColor: isActive ? 'primary.main' : 'divider',
                  borderLeftWidth: isActive ? 3 : 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="subtitle2" noWrap>
                      {entry.name}
                    </Typography>
                    {entry.version && (
                      <Typography variant="caption" color="text.secondary">
                        v{entry.version}
                      </Typography>
                    )}
                    {!entry.inCatalog && (
                      <Chip
                        label="orphan"
                        size="small"
                        color="warning"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    {entry.loadState === 'failed' && (
                      <Chip
                        label="failed"
                        size="small"
                        color="error"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    {isActive && (
                      <Chip
                        label="active"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  {entry.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {entry.description}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flexShrink: 0 }}>
                  {action === 'loading' && <CircularProgress size={24} />}
                  {action === 'enable' && (
                    <Button
                      size="small"
                      variant="contained"
                      disableElevation
                      onClick={() => void activateApp(entry.id)}
                    >
                      Enable
                    </Button>
                  )}
                  {action === 'disable' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void deactivateApp(entry.id)}
                    >
                      Disable
                    </Button>
                  )}
                  {action === 'retry' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => void retryApp(entry.id)}
                    >
                      Retry
                    </Button>
                  )}
                  {action === 'remove' && (
                    <Tooltip title="Remove orphan app">
                      <IconButton
                        size="small"
                        onClick={() => removeOrphan(entry.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Paper>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
