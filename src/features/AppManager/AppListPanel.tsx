import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { AppCatalogEntry } from '../../models/AppModel/AppCatalogEntry'
import { AppLoadState } from '../../models/AppModel/AppLoadState'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { CyApp } from '../../models/AppModel/CyApp'
import { AppSource } from '../../models/AppModel/InstalledApp'
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
  /** Provenance of the catalog entry (undefined for orphans) */
  source?: AppSource
  /** Whether this row can be uninstalled from the workspace (§12.3) */
  removable: boolean
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
  const catalogSources: Record<string, AppSource> = useAppStore(
    (state) => state.catalogSources,
  )
  const loadStates: Record<string, AppLoadState> = useAppStore(
    (state) => state.loadStates,
  )
  const { activateApp, deactivateApp, retryApp, removeOrphan, uninstallApp } =
    useAppManagerCommands()

  // Overflow (kebab) menu and uninstall-confirmation state
  const [menu, setMenu] = useState<{
    anchorEl: HTMLElement
    entry: AppDisplayEntry
  } | null>(null)
  const [confirm, setConfirm] = useState<AppDisplayEntry | null>(null)

  // Build merged display list: catalog entries + orphan apps
  const displayEntries: AppDisplayEntry[] = []
  const seenIds = new Set<string>()

  // 1. All catalog entries
  for (const entry of Object.values(catalog)) {
    seenIds.add(entry.id)
    const app = apps[entry.id]
    const source = catalogSources[entry.id]
    displayEntries.push({
      id: entry.id,
      name: entry.name ?? entry.id,
      description: entry.description ?? app?.description,
      version: entry.version ?? app?.version,
      author: entry.author,
      inCatalog: true,
      loadState: loadStates[entry.id],
      status: app?.status,
      source,
      // Only workspace-installed apps are uninstallable; manifest apps are
      // disable-only (§12.3).
      removable: source === 'appstore' || source === 'snapshot',
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
      // Orphans keep the existing (unconfirmed) removeOrphan path, not the
      // kebab uninstall.
      removable: false,
    })
  }

  return (
    <Box>
      {displayEntries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No apps available in catalog.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {displayEntries.map((entry) => {
            const action = getAction(entry)
            const isActive =
              entry.loadState === 'loaded' && entry.status === AppStatus.Active
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
                    {entry.removable && (
                      <Chip
                        label={
                          entry.source === 'snapshot' ? 'Snapshot' : 'App Store'
                        }
                        size="small"
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

                <Box
                  sx={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  {action === 'loading' && <CircularProgress size={24} />}
                  {(action === 'enable' || action === 'disable') && (
                    <Switch
                      data-testid={`app-toggle-${entry.id}`}
                      size="small"
                      checked={action === 'disable'}
                      onChange={() => {
                        if (action === 'disable') {
                          void deactivateApp(entry.id)
                        } else {
                          void activateApp(entry.id)
                        }
                      }}
                    />
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
                  {entry.removable && (
                    <Tooltip title="More options">
                      <IconButton
                        size="small"
                        data-testid={`app-kebab-${entry.id}`}
                        onClick={(e) =>
                          setMenu({ anchorEl: e.currentTarget, entry })
                        }
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Paper>
            )
          })}
        </Box>
      )}

      {/* Overflow menu for workspace-installed apps (§12.4) */}
      <Menu
        anchorEl={menu?.anchorEl}
        open={menu !== null}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          data-testid="app-uninstall-menuitem"
          onClick={() => {
            if (menu !== null) {
              setConfirm(menu.entry)
              setMenu(null)
            }
          }}
        >
          Uninstall
        </MenuItem>
      </Menu>

      {/* Uninstall confirmation (§12.5) */}
      <CyDialog
        open={confirm !== null}
        data-testid="app-uninstall-confirm-dialog"
      >
        <DialogTitle>Uninstall app</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Uninstall <strong>{confirm?.name}</strong>? It will be removed from
            this workspace.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            data-testid="app-uninstall-confirm-button"
            onClick={() => {
              if (confirm !== null) {
                const id = confirm.id
                setConfirm(null)
                void uninstallApp(id)
              }
            }}
          >
            Uninstall
          </Button>
        </DialogActions>
      </CyDialog>
    </Box>
  )
}
