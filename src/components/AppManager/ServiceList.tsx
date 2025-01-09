import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Link,
} from '@mui/material'
import { ServiceApp } from '../../models/AppModel/ServiceApp'

import DeleteIcon from '@mui/icons-material/Delete'
import { useAppStore } from '../../store/AppStore'

export const ServiceList = () => {
  const serviceApps: Record<string, ServiceApp> = useAppStore(
    (state) => state.serviceApps,
  )
  const removeService = useAppStore((state) => state.removeService)
  const handleDeleteServiceApp = (url: string) => {
    removeService(url)
  }

  return (
    <List>
      {Object.values(serviceApps).map((serviceApp: ServiceApp) => (
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
  )
}
