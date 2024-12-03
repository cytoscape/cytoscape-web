import {
  Box,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import { CyApp } from '../../models/AppModel'
import { useAppStore } from '../../store/AppStore'
import { AppStatus } from '../../models/AppModel/AppStatus'

export const AppListPanel = () => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const setStatus = useAppStore((state) => state.setStatus)

  return (
    <Box>
      <Typography
        sx={{ display: 'inline' }}
        component="span"
        variant="h6"
        color="text.primary"
      >
        Status of Apps
      </Typography>
      <Typography variant="body1">
        {Object.keys(apps).length === 0
          ? '(No Apps are currently registered)'
          : ''}
      </Typography>

      <List>
        {Object.values(apps).map((app: CyApp) => (
          <ListItem
            key={app.id}
            secondaryAction={
              <Checkbox
                edge="end"
                onChange={(e) =>
                  setStatus(
                    app.id,
                    e.target.checked ? AppStatus.Active : AppStatus.Inactive,
                  )
                }
                disabled={app.status === AppStatus.Error}
                checked={app.status === AppStatus.Active}
              />
            }
          >
            <ListItemText
              primary={<Typography variant="h6">{app.name}</Typography>}
              secondary={
                <Typography
                  sx={{ display: 'inline' }}
                  component="span"
                  variant="body1"
                  color="text.primary"
                >
                  {app.description}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
