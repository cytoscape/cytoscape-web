import {
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'

import { CyDialog } from '@/components/CyDialog'
import { useAppStore } from '@/data/hooks/stores/AppStore'
import type { AppCatalogEntry } from '@/models/AppModel/AppCatalogEntry'
import { AppType } from '@/models/AppModel/AppType'
import { appInstallPreview } from '@/models/AppModel/impl/appInstallMessage'
import { appVersionChange } from '@/models/AppModel/impl/appVersion'
import { runsOnThisHost } from './install/installGate'
import type { PendingAppInstall } from '@/models/AppModel/PendingAppInstall'
import { pendingInstallName } from '@/models/AppModel/PendingAppInstall'

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
 * What confirming does to a React app the catalog already has: updates it,
 * keeps a newer or compatible installed version, or finds the same version
 * (§7.5). Decided with the same compatibility check `installApp` uses, so the
 * dialog promises what the install does.
 */
const versionNoteOf = (
  pending: PendingAppInstall,
  catalog: Record<string, AppCatalogEntry>,
): string | undefined =>
  pending.type === AppType.Client
    ? appInstallPreview(
        appVersionChange(
          pending.entry,
          catalog[pending.entry.id],
          runsOnThisHost,
        ),
      )
    : undefined

/**
 * Asks the user to confirm apps an `?installApp=` link wants to add.
 *
 * A URL can install either a React app or a service app, from an arbitrary
 * origin, so the user is told what each item actually is before anything is
 * added — name, kind, version, author, description and source URL. A React
 * app the catalog already has also says whether confirming updates it or
 * keeps the installed version. Confirm is all-or-nothing; Cancel installs
 * nothing.
 */
export const AppInstallConfirmationDialog = ({
  pending,
  onConfirm,
  onCancel,
}: AppInstallConfirmationDialogProps): JSX.Element => {
  const catalog = useAppStore((state) => state.catalog)
  return (
    <CyDialog
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
                    {item.type === AppType.Client &&
                      versionNoteOf(item, catalog) !== undefined && (
                        <Typography
                          variant="body2"
                          color="info.main"
                          data-testid={`app-install-version-${item.entry.id}`}
                        >
                          {versionNoteOf(item, catalog)}
                        </Typography>
                      )}
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
    </CyDialog>
  )
}
