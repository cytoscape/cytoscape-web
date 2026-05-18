import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import {
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { useAppStore } from '../../data/hooks/stores/AppStore'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { ExampleServicePanel } from './ExampleServicePanel'
import { ServiceList } from './ServiceList'

export const ServiceListPanel = () => {
  const [newUrl, setNewUrl] = useState<string>('')

  // Warning message to display when the user tries to add
  // a service that is already registered
  const [warningMessage, setWarningMessage] = useState<string>('')

  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const addService = useAppStore((state) => state.addService)

  const handleClearUrl = () => {
    setNewUrl('')
    setWarningMessage('')
  }

  const handleAddServiceApp = async () => {
    let trimmedUrl: string = newUrl.trim()
    if (trimmedUrl.endsWith('/')) {
      trimmedUrl = trimmedUrl.slice(0, -1) // Remove the last character if it is '/'
    }

    if (trimmedUrl !== '') {
      const serviceApp = serviceApps[trimmedUrl]
      if (serviceApp !== undefined) {
        setWarningMessage(`The service already registered: "${trimmedUrl}".`)
        return
      }
      try {
        await addService(trimmedUrl)
        setWarningMessage('')
      } catch (e) {
        setWarningMessage(
          `Failed to add the service at "${trimmedUrl}" due to: ${e.message}.`,
        )
        console.error(
          `[${ServiceListPanel.name}]:[handleAddServiceApp]: Failed to add the service from ${trimmedUrl}. ${e}`,
        )
      }
      setNewUrl('')
    }
  }

  return (
    <Box>
      <Typography
        sx={{ display: 'inline' }}
        component="span"
        variant="h6"
        color="text.primary"
      >
        Service Apps Manager
      </Typography>
      {warningMessage && (
        <Typography color="error" variant="body2">
          {warningMessage}
        </Typography>
      )}
      {Object.keys(serviceApps).length === 0 ? (
        <ExampleServicePanel />
      ) : (
        <ServiceList />
      )}
      <Box
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          marginLeft: '1em',
          padding: 0,
          paddingRight: '2em',
        }}
      >
        <TextField
          label="Enter new external service URL"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          size="small"
          sx={{ mr: 1, flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          onClick={handleClearUrl}
          disabled={newUrl.trim() === ''}
          sx={{ mr: 1 }}
        >
          Clear
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddServiceApp}
          disabled={newUrl.trim() === ''}
        >
          Add
        </Button>
      </Box>
    </Box>
  )
}
