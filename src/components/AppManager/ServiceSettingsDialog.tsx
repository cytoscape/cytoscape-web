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
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

import { useAppStore } from '../../store/AppStore'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { useState } from 'react'

interface ServiceSettingsDialogProps {
  openDialog: boolean
  setOpenDialog: (open: boolean) => void
}

const SAMPLE_SERVICE_1 = 'https://cd.ndexbio.org/cy/cytocontainer/v1/louvain'
const SAMPLE_SERVICE_2 =
  'https://cd.ndexbio.org/cy/cytocontainer/v1/updatetablesexample'

export const ServiceSettingsDialog = ({
  openDialog,
  setOpenDialog,
}: ServiceSettingsDialogProps) => {
  const [newUrl, setNewUrl] = useState<string>('')

  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )

  const removeService = useAppStore((state) => state.removeService)

  const addService = useAppStore((state) => state.addService)

  const handleAddServiceApp = async () => {
    if (newUrl.trim()) {
      if (newUrl !== '') {
        await addService(newUrl)
        setNewUrl('')
      }
    }
  }

  const handleDeleteServiceApp = (url: string) => {
    removeService(url)
  }

  return (
    <Dialog open={openDialog}>
      <DialogTitle>External Services</DialogTitle>
      <DialogContent>
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
            style={{ marginRight: '8px' }}
            size="small"
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddServiceApp}
            disabled={newUrl.trim() === ''}
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
