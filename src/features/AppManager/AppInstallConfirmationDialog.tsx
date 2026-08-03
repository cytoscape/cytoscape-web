import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'

import { AppType } from '../../models/AppModel/AppType'
import type { PendingAppInstall } from '../../models/AppModel/PendingAppInstall'
import { pendingInstallName } from '../../models/AppModel/PendingAppInstall'

interface AppInstallConfirmationDialogProps {
  /** Apps the URL asked to install. The dialog is hidden when empty. */
  pending: PendingAppInstall[]
  onConfirm: () => void
  onCancel: () => void
}

/** Version and author, whichever of the two the app actually declared. */
const subtitleOf = (pending: PendingAppInstall): string => {
  const version =
    pending.type === AppType.Client
      ? pending.entry.version
      : pending.metadata.version
  const author =
    pending.type === AppType.Client
      ? pending.entry.author
      : pending.metadata.author
  return [
    version !== undefined && version !== '' ? `v${version}` : undefined,
    author !== undefined && author !== null && author !== ''
      ? author
      : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(' — ')
}

const descriptionOf = (pending: PendingAppInstall): string => {
  const description =
    pending.type === AppType.Client
      ? pending.entry.description
      : pending.metadata.description
  return description === undefined || description === null ? '' : description
}

/**
 * Asks the user to confirm apps an `?installApp=` link wants to add.
 *
 * A URL can install either a React app or a service app, from an arbitrary
 * origin, so the user is told what each item actually is before anything is
 * added — name, kind, version, author, description and source URL. Confirm is
 * all-or-nothing; Cancel installs nothing.
 */
export const AppInstallConfirmationDialog = ({
  pending,
  onConfirm,
  onCancel,
}: AppInstallConfirmationDialogProps): JSX.Element => {
  return (
    <Dialog
      data-testid="app-install-confirmation-dialog"
      open={pending.length > 0}
      maxWidth="sm"
      fullWidth
      aria-labelledby="app-install-confirmation-dialog-title"
    >
      <DialogTitle id="app-install-confirmation-dialog-title">
        Install into this workspace?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          This link wants to add the following to Cytoscape Web:
        </DialogContentText>
        <List dense sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {pending.map((item) => (
            <ListItem
              key={item.url}
              data-testid={`app-install-row-${
                item.type === AppType.Client ? item.entry.id : item.url
              }`}
              disableGutters
              alignItems="flex-start"
            >
              <ListItemText
                disableTypography
                primary={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.25,
                    }}
                  >
                    <Typography variant="subtitle1" color="text.primary">
                      {pendingInstallName(item)}
                    </Typography>
                    <Chip
                      size="small"
                      label={item.type === AppType.Client ? 'App' : 'Service'}
                      color={
                        item.type === AppType.Client ? 'primary' : 'secondary'
                      }
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {subtitleOf(item)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    {descriptionOf(item) !== '' && (
                      <Typography variant="body2" color="text.secondary">
                        {descriptionOf(item)}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ wordBreak: 'break-all' }}
                    >
                      {item.url}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
        <DialogContentText variant="body2">
          Only install apps from sources you trust.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="app-install-confirmation-dialog-cancel"
          variant="outlined"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          data-testid="app-install-confirmation-dialog-confirm"
          variant="contained"
          onClick={onConfirm}
          autoFocus
        >
          Install
        </Button>
      </DialogActions>
    </Dialog>
  )
}
