import { Box, Button, Typography } from '@mui/material'
import { useContext } from 'react'

import { AppConfig, AppConfigContext } from '../../AppConfigContext'
import { useAppStore } from '../../hooks/stores/AppStore'
import { ServiceApp } from '../../models/AppModel/ServiceApp'

export const ExampleServicePanel = () => {
  const { defaultServices } = useContext<AppConfig>(AppConfigContext)
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const addService = useAppStore((state) => state.addService)

  const addDefaultServices = (): void => {
    const currentServiceUrls = Object.values(serviceApps).map(
      (serviceApp: ServiceApp) => serviceApp.url,
    )
    const urlSet = new Set(currentServiceUrls)

    defaultServices.forEach((url: string) => {
      if (!urlSet.has(url)) {
        try {
          addService(url)
        } catch (e) {
          console.error(
            `[${ExampleServicePanel.name}]:[addDefaultServices]: Failed to add the service from ${url}. ${e}`,
          )
        }
      }
    })
  }
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: '1em',
      }}
    >
      <Typography variant="body1">No services are registered yet</Typography>
      <Button
        variant="outlined"
        color="primary"
        size="small"
        sx={{ marginLeft: '1em', textTransform: 'none' }}
        onClick={addDefaultServices}
      >
        Add Example Services
      </Button>
    </Box>
  )
}
