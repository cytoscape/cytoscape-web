import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Tooltip,
} from '@mui/material'
import { useState } from 'react'

import { useStyleLibraryStore } from '../../../data/hooks/stores/StyleLibraryStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { StyleTemplate } from '../../../models/VisualStyleModel'
import { StyleLibraryDialog } from './StyleLibraryDialog'
import { StyleNameDialog } from './StyleNameDialog'

type DialogKind =
  | 'none'
  | 'create'
  | 'rename'
  | 'delete'
  | 'saveToLibrary'
  | 'library'

/**
 * Style selector + management menu shown at the top of the Vizmapper panel.
 *
 * Lets the user switch between a network's named styles and
 * create / duplicate / rename / delete them, plus exchange styles with the
 * workspace-level style library (copy-on-assign in both directions).
 */
export const StyleManager = (props: {
  networkId: IdType
}): React.ReactElement => {
  const { networkId } = props

  const styleSet = useVisualStyleStore((state) => state.styleSets[networkId])
  const switchStyle = useVisualStyleStore((state) => state.switchStyle)
  const createStyle = useVisualStyleStore((state) => state.createStyle)
  const duplicateStyle = useVisualStyleStore((state) => state.duplicateStyle)
  const renameStyle = useVisualStyleStore((state) => state.renameStyle)
  const deleteStyle = useVisualStyleStore((state) => state.deleteStyle)
  const importStyle = useVisualStyleStore((state) => state.importStyle)
  const activeVisualStyle = useVisualStyleStore(
    (state) => state.visualStyles[networkId],
  )

  const addTemplate = useStyleLibraryStore((state) => state.addTemplate)

  const setNetworkModified = useWorkspaceStore(
    (state) => state.setNetworkModified,
  )

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [dialog, setDialog] = useState<DialogKind>('none')

  const entries = Object.values(styleSet?.styles ?? {})
  const activeStyleId = styleSet?.activeStyleId ?? ''
  const activeEntry = styleSet?.styles[activeStyleId]

  if (styleSet === undefined || activeEntry === undefined) {
    return <></>
  }

  const markModified = (): void => {
    setNetworkModified(networkId, true)
  }

  const closeMenu = (): void => setMenuAnchor(null)

  const handleSwitch = (styleId: IdType): void => {
    if (styleId === activeStyleId) {
      return
    }
    switchStyle(networkId, styleId)
    markModified()
    logUi.info(`[StyleManager]: Switched to style ${styleId}`, { networkId })
  }

  const handleCreate = (name: string): void => {
    const newId = createStyle(networkId, name)
    if (newId !== undefined) {
      switchStyle(networkId, newId)
      markModified()
    }
  }

  const handleDuplicate = (): void => {
    const newId = duplicateStyle(networkId, activeStyleId)
    if (newId !== undefined) {
      markModified()
    }
  }

  const handleRename = (name: string): void => {
    renameStyle(networkId, activeStyleId, name)
    markModified()
  }

  const handleDelete = (): void => {
    deleteStyle(networkId, activeStyleId)
    markModified()
    setDialog('none')
  }

  const handleSaveToLibrary = (name: string): void => {
    if (activeVisualStyle !== undefined) {
      addTemplate(name, activeVisualStyle)
    }
  }

  const handleApplyTemplate = (template: StyleTemplate): void => {
    const newId = importStyle(networkId, template.name, template.visualStyle)
    if (newId !== undefined) {
      switchStyle(networkId, newId)
      markModified()
    }
    setDialog('none')
  }

  return (
    <Box
      data-testid="style-manager"
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1,
        py: 0.5,
        height: 40,
        borderBottom: (theme) =>
          `2px solid ${theme.palette.background.default}`,
      }}
    >
      <Select
        size="small"
        value={activeStyleId}
        onChange={(e) => handleSwitch(e.target.value)}
        sx={{ flexGrow: 1, minWidth: 0, height: 30, fontSize: 13 }}
        data-testid="style-manager-select"
        inputProps={{ 'data-testid': 'style-manager-select-input' }}
      >
        {entries.map((entry) => (
          <MenuItem
            key={entry.id}
            value={entry.id}
            data-testid={`style-manager-option-${entry.id}`}
          >
            {entry.name}
          </MenuItem>
        ))}
      </Select>
      <Tooltip title="Manage styles">
        <IconButton
          size="small"
          sx={{ ml: 0.5 }}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          data-testid="style-manager-menu-button"
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            closeMenu()
            setDialog('create')
          }}
          data-testid="style-manager-new-menu-item"
        >
          <ListItemText>New Style (copy of current)…</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            handleDuplicate()
          }}
          data-testid="style-manager-duplicate-menu-item"
        >
          <ListItemText>Duplicate Current Style</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            setDialog('rename')
          }}
          data-testid="style-manager-rename-menu-item"
        >
          <ListItemText>Rename Current Style…</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={entries.length <= 1}
          onClick={() => {
            closeMenu()
            setDialog('delete')
          }}
          data-testid="style-manager-delete-menu-item"
        >
          <ListItemText>Delete Current Style…</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            closeMenu()
            setDialog('saveToLibrary')
          }}
          data-testid="style-manager-save-to-library-menu-item"
        >
          <ListItemText>Save Style to Library…</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            setDialog('library')
          }}
          data-testid="style-manager-open-library-menu-item"
        >
          <ListItemText>Apply Style from Library…</ListItemText>
        </MenuItem>
      </Menu>

      <StyleNameDialog
        open={dialog === 'create'}
        title="New Style"
        confirmLabel="Create"
        initialName="New Style"
        onConfirm={handleCreate}
        onClose={() => setDialog('none')}
      />
      <StyleNameDialog
        open={dialog === 'rename'}
        title="Rename Style"
        confirmLabel="Rename"
        initialName={activeEntry.name}
        onConfirm={handleRename}
        onClose={() => setDialog('none')}
      />
      <StyleNameDialog
        open={dialog === 'saveToLibrary'}
        title="Save Style to Library"
        confirmLabel="Save"
        initialName={activeEntry.name}
        onConfirm={handleSaveToLibrary}
        onClose={() => setDialog('none')}
      />
      <Dialog
        open={dialog === 'delete'}
        onClose={() => setDialog('none')}
        data-testid="style-manager-delete-dialog"
      >
        <DialogTitle>Delete Style</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete the style &ldquo;{activeEntry.name}&rdquo;? This cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialog('none')}
            data-testid="style-manager-delete-cancel-button"
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            data-testid="style-manager-delete-confirm-button"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <StyleLibraryDialog
        open={dialog === 'library'}
        onApply={handleApplyTemplate}
        onClose={() => setDialog('none')}
      />
    </Box>
  )
}
