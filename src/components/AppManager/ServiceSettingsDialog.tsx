/**
 * A dialog to add / remove disable the apps
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Link,
  Divider,
  useTheme,
  Theme,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

import { useAppStore } from '../../store/AppStore'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { useState } from 'react'

// import { AppConfig, AppConfigContext } from '../../AppConfigContext'

interface ServiceSettingsDialogProps {
  openDialog: boolean
  setOpenDialog: (open: boolean) => void
}

export const ServiceSettingsDialog = ({
  openDialog,
  setOpenDialog,
}: ServiceSettingsDialogProps) => {
  const theme: Theme = useTheme()

  const [newUrl, setNewUrl] = useState<string>('')

  // Warning message to display when the user tries to add
  // a service that is already registered
  const [warningMessage, setWarningMessage] = useState<string>('')

  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const removeService = useAppStore((state) => state.removeService)
  const addService = useAppStore((state) => state.addService)

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
        console.error(`Failed to add the service from ${trimmedUrl}. ${e}`)
      }
      setNewUrl('')
    }
  }

  const handleDeleteServiceApp = (url: string) => {
    removeService(url)
  }

  const handleClearUrl = () => {
    setNewUrl('')
    setWarningMessage('')
  }

  return (
    <Dialog open={openDialog}>
      <DialogTitle>External Services</DialogTitle>
      <DialogContent>
        {warningMessage && (
          <Typography color="error" variant="body2">
            {warningMessage}
          </Typography>
        )}
        <List>
          {Object.values(serviceApps).map((serviceApp: ServiceApp) => (
            <ListItem key={serviceApp.url}>
              <ListItemText
                primary={
                  <Typography variant="h6">{serviceApp.name}</Typography>
                }
                secondary={
                  <>
                    <Typography
                      sx={{ display: 'inline' }}
                      component="span"
                      variant="body2"
                      color="text.secondary"
                    >
                      Endpoint: &nbsp;
                      <Link
                        href={serviceApp.url}
                        target="_blank"
                        rel="noopener"
                      >
                        {serviceApp.url}
                      </Link>
                    </Typography>
                    <Box>
                      <Typography
                        sx={{ display: 'inline' }}
                        component="span"
                        variant="body1"
                        color="text.primary"
                      >
                        {serviceApp.description}
                      </Typography>
                    </Box>
                  </>
                }
              />
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleDeleteServiceApp(serviceApp.url)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <Box
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            margin: 0,
            padding: 0,
          }}
        >
          <TextField
            label="Enter new external service URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            style={{ marginRight: theme.spacing(1) }}
            size="small"
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleClearUrl}
            disabled={newUrl.trim() === ''}
            sx={{ marginRight: theme.spacing(1), width: '4em' }}
          >
            Clear
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleAddServiceApp}
            disabled={newUrl.trim() === ''}
            sx={{ width: '4em' }}
          >
            Add
          </Button>
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={() => setOpenDialog(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
