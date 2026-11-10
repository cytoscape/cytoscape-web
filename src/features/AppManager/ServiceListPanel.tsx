import RefreshIcon from '@mui/icons-material/Refresh'
import { Box, Button, Typography } from '@mui/material'
import { useState } from 'react'

import { useAppStore } from '../../data/hooks/stores/AppStore'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { ExampleServicePanel } from './ExampleServicePanel'
import { ServiceList } from './ServiceList'

/**
 * The Service Apps tab: the registered services and Refresh all. Services are
 * added through the dialog's Install from URL field, which serves both app
 * kinds (#827).
 */
export const ServiceListPanel = () => {
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const refreshAllServices = useAppStore((state) => state.refreshAllServices)

  const [isRefreshingAll, setIsRefreshingAll] = useState<boolean>(false)

  const hasServiceApps = Object.keys(serviceApps).length > 0

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true)
    try {
      await refreshAllServices()
    } finally {
      setIsRefreshingAll(false)
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography component="span" variant="h6" color="text.primary">
          Service Apps Manager
        </Typography>
        {hasServiceApps && (
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
          >
            {isRefreshingAll ? 'Refreshing...' : 'Refresh all'}
          </Button>
        )}
      </Box>
      {Object.keys(serviceApps).length === 0 ? (
        <ExampleServicePanel />
      ) : (
        <ServiceList />
      )}
    </Box>
  )
}
