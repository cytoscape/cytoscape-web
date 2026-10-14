import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Box,
  CircularProgress,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { useAppStore } from '../../data/hooks/stores/AppStore'
import { logApp } from '../../debug'
import { ServiceApp } from '../../models/AppModel/ServiceApp'

export const ServiceList = () => {
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )
  const removeService = useAppStore((state) => state.removeService)
  const refreshService = useAppStore((state) => state.refreshService)

  // URLs currently being refreshed (shows a spinner in place of the icon).
  const [refreshingUrls, setRefreshingUrls] = useState<Set<string>>(new Set())

  const handleDeleteServiceApp = (url: string) => {
    removeService(url)
  }

  const handleRefreshServiceApp = async (url: string) => {
    setRefreshingUrls((prev) => new Set(prev).add(url))
    try {
      await refreshService(url)
    } catch (error) {
      logApp.error(
        `[ServiceList]: Failed to refresh service app: ${url}`,
        error,
      )
    } finally {
      setRefreshingUrls((prev) => {
        const next = new Set(prev)
        next.delete(url)
        return next
      })
    }
  }

  return (
    <List sx={{ maxHeight: 300, overflowY: 'auto' }}>
      {Object.values(serviceApps).map((serviceApp: ServiceApp) => {
        const isRefreshing = refreshingUrls.has(serviceApp.url)
        return (
          <ListItem key={serviceApp.url}>
            <ListItemText
              primary={<Typography variant="h6">{serviceApp.name}</Typography>}
              secondary={
                <>
                  <Typography
                    sx={{ display: 'inline' }}
                    component="span"
                    variant="body2"
                    color="text.secondary"
                  >
                    Endpoint: &nbsp;
                    <Link href={serviceApp.url} target="_blank" rel="noopener">
                      {serviceApp.url}
                    </Link>
                  </Typography>
                  <Box>
                    <Typography
                      sx={{ display: 'inline' }}
                      component="span"
                      variant="body1"
                      color="text.secondary"
                    >
                      {serviceApp.description}
                    </Typography>
                  </Box>
                </>
              }
            />
            <Tooltip title="Refresh this service app's definition">
              <span>
                <IconButton
                  aria-label="refresh"
                  disabled={isRefreshing}
                  onClick={() => handleRefreshServiceApp(serviceApp.url)}
                >
                  {isRefreshing ? (
                    <CircularProgress size={20} />
                  ) : (
                    <RefreshIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={() => handleDeleteServiceApp(serviceApp.url)}
            >
              <DeleteIcon />
            </IconButton>
          </ListItem>
        )
      })}
    </List>
  )
}
