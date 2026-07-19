import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

import { useStyleLibraryStore } from '../../../data/hooks/stores/StyleLibraryStore'
import { IdType } from '../../../models/IdType'
import { StyleTemplate } from '../../../models/VisualStyleModel'
import { StyleNameDialog } from './StyleNameDialog'

interface StyleLibraryDialogProps {
  open: boolean
  onApply: (template: StyleTemplate) => void
  onClose: () => void
}

/**
 * Browser for the workspace-level style library.
 *
 * Applying a template COPIES it into the current network's style set;
 * the library entry itself stays untouched.
 */
export const StyleLibraryDialog = (
  props: StyleLibraryDialogProps,
): React.ReactElement => {
  const { open, onApply, onClose } = props

  const templates = useStyleLibraryStore((state) => state.templates)
  const hydrate = useStyleLibraryStore((state) => state.hydrate)
  const renameTemplate = useStyleLibraryStore((state) => state.renameTemplate)
  const deleteTemplate = useStyleLibraryStore((state) => state.deleteTemplate)

  const [renameTargetId, setRenameTargetId] = useState<IdType | undefined>()

  useEffect(() => {
    if (open) {
      void hydrate()
    }
  }, [open, hydrate])

  const templateList = Object.values(templates)
  const renameTarget =
    renameTargetId !== undefined ? templates[renameTargetId] : undefined

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        data-testid="style-library-dialog"
      >
        <DialogTitle>Style Library</DialogTitle>
        <DialogContent>
          {templateList.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', py: 2 }}
              data-testid="style-library-empty-message"
            >
              No styles in the library yet. Use &ldquo;Save Style to
              Library&rdquo; in the style menu to add the current style.
            </Typography>
          ) : (
            <List dense data-testid="style-library-list">
              {templateList.map((template) => (
                <ListItem
                  key={template.id}
                  data-testid={`style-library-item-${template.id}`}
                  secondaryAction={
                    <>
                      <Button
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={() => onApply(template)}
                        data-testid={`style-library-apply-button-${template.id}`}
                      >
                        Apply
                      </Button>
                      <Tooltip title="Rename">
                        <IconButton
                          size="small"
                          onClick={() => setRenameTargetId(template.id)}
                          data-testid={`style-library-rename-button-${template.id}`}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => deleteTemplate(template.id)}
                          data-testid={`style-library-delete-button-${template.id}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  }
                >
                  <ListItemText primary={template.name} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} data-testid="style-library-close-button">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <StyleNameDialog
        open={renameTarget !== undefined}
        title="Rename Library Style"
        confirmLabel="Rename"
        initialName={renameTarget?.name ?? ''}
        onConfirm={(name) => {
          if (renameTargetId !== undefined) {
            renameTemplate(renameTargetId, name)
          }
        }}
        onClose={() => setRenameTargetId(undefined)}
      />
    </>
  )
}
