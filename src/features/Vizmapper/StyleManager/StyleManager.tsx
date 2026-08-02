import MoreVertIcon from '@mui/icons-material/MoreVert'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import {
  Box,
  Button,
  ButtonBase,
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
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { useStyleLibraryStore } from '@/data/hooks/stores/StyleLibraryStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '@/data/hooks/useUndoStack'
import { logUi } from '@/debug'
import { IdType } from '@/models/IdType'
import { UndoCommandType } from '@/models/StoreModel/UndoStoreModel'
import { StyleTemplate, VisualStyle } from '@/models/VisualStyleModel'
import { useStylePreviewSample } from './preview/useStylePreviewSample'
import { useStyleThumbnail } from './preview/useStyleThumbnail'
import { StyleLibraryDialog } from './StyleLibraryDialog'
import { StyleNameDialog } from './StyleNameDialog'
import { StylePickerDialog } from './StylePickerDialog'

type DialogKind =
  | 'none'
  | 'create'
  | 'rename'
  | 'delete'
  | 'saveToLibrary'
  | 'library'
  | 'picker'

/**
 * Style selector + management menu shown at the top of the Vizmapper panel.
 *
 * The selector is a button showing the active style's thumbnail and name; it
 * opens StylePickerDialog, a grid of previews covering this network's styles,
 * other networks' styles, and the library. It replaced a plain name dropdown,
 * in which no style could be told apart from any other without applying it.
 *
 * The MoreVert menu keeps create / duplicate / rename / delete and the library
 * exchange (copy-on-assign in both directions).
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

  const { postEdit } = useUndoStack()
  const sample = useStylePreviewSample(networkId)

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [dialog, setDialog] = useState<DialogKind>('none')
  // Which style the tile menu acted on; the dialogs below are shared with the
  // MoreVert menu, which always targets the active style.
  const [targetStyleId, setTargetStyleId] = useState<IdType | undefined>()

  const entries = Object.values(styleSet?.styles ?? {})
  const activeStyleId = styleSet?.activeStyleId ?? ''
  const activeEntry = styleSet?.styles[activeStyleId]

  const { dataUrl: activeThumbnail } = useStyleThumbnail(
    activeVisualStyle,
    sample,
  )

  if (styleSet === undefined || activeEntry === undefined) {
    return <></>
  }

  const markModified = (): void => {
    setNetworkModified(networkId, true)
  }

  const closeMenu = (): void => setMenuAnchor(null)

  // The style the shared rename/delete dialogs act on: whatever a tile menu
  // picked, else the active style (the MoreVert menu's target).
  const effectiveTargetId = targetStyleId ?? activeStyleId
  const effectiveTargetEntry = styleSet.styles[effectiveTargetId] ?? activeEntry

  const openDialogFor = (kind: DialogKind, styleId?: IdType): void => {
    setTargetStyleId(styleId)
    setDialog(kind)
  }

  const closeDialog = (): void => {
    setDialog('none')
    setTargetStyleId(undefined)
  }

  const handleSwitch = (styleId: IdType): void => {
    if (styleId === activeStyleId) {
      return
    }
    const previousStyleId = activeStyleId
    if (!switchStyle(networkId, styleId)) {
      return
    }
    markModified()
    // Recorded as an undoable edit rather than clearing the history, which is
    // what switchStyle used to do. Undoing this restores the previous style
    // BEFORE any older edit replays, so those edits land on the style they were
    // recorded under. Only the ids travel on the stack — never style content.
    postEdit(
      UndoCommandType.SWITCH_STYLE,
      `Switch style to "${styleSet.styles[styleId]?.name ?? styleId}"`,
      [networkId, previousStyleId],
      [networkId, styleId],
      // Explicit: this is the network the switch actually mutated, which is not
      // necessarily the one postEdit would infer on this render.
      networkId,
    )
    logUi.info(`[StyleManager]: Switched to style ${styleId}`, { networkId })
  }

  const handleCopyIn = (name: string, visualStyle: VisualStyle): void => {
    // Copy-on-assign: the source style (another network's, or a library
    // template) is never referenced, so editing this copy cannot reach back.
    const previousStyleId = activeStyleId
    const newId = importStyle(networkId, name, visualStyle)
    if (newId !== undefined) {
      if (switchStyle(networkId, newId)) {
        // Undoable, like any other switch. Copying a style in changes how the
        // network looks just as much as switching does, so leaving Undo greyed
        // out afterwards reads as undo being broken.
        //
        // Only the SWITCH is recorded, not the import: undo reverts which style
        // is active and leaves the copy in the list. Deleting it on undo would
        // mean carrying the style's whole content in redoParams so redo could
        // recreate it, and the undo stack is persisted to IndexedDB — a stack of
        // 30kB styles is not something to put there. The leftover style is inert
        // until selected, and deletable.
        postEdit(
          UndoCommandType.SWITCH_STYLE,
          // The STORED name, read fresh: importStyle de-duplicates, so a second
          // copy from the same source is "X 2" and the description has to match
          // what the user sees in the list.
          `Switch style to "${
            useVisualStyleStore.getState().styleSets[networkId]?.styles[newId]
              ?.name ?? name
          }"`,
          [networkId, previousStyleId],
          [networkId, newId],
          networkId,
        )
      }
      markModified()
    }
    closeDialog()
  }

  const handleCreate = (name: string): void => {
    const previousStyleId = activeStyleId
    const newId = createStyle(networkId, name)
    if (newId !== undefined) {
      if (switchStyle(networkId, newId)) {
        // Recorded like handleSwitch and handleCopyIn. Creating a style makes it
        // active, which changes how the network looks; without this the switch
        // is the one style change Undo cannot reverse.
        //
        // Only the SWITCH is recorded, not the creation: undo reverts which
        // style is active and leaves the new (empty) style in the list, for the
        // same reason as handleCopyIn.
        postEdit(
          UndoCommandType.SWITCH_STYLE,
          // The STORED name, read fresh: createStyle de-duplicates.
          `Switch style to "${
            useVisualStyleStore.getState().styleSets[networkId]?.styles[newId]
              ?.name ?? name
          }"`,
          [networkId, previousStyleId],
          [networkId, newId],
          networkId,
        )
      }
      markModified()
    }
  }

  const handleDuplicate = (styleId: IdType = activeStyleId): void => {
    const newId = duplicateStyle(networkId, styleId)
    if (newId !== undefined) {
      markModified()
    }
  }

  const handleRename = (name: string): void => {
    renameStyle(networkId, effectiveTargetId, name)
    markModified()
  }

  const handleDelete = (): void => {
    deleteStyle(networkId, effectiveTargetId)
    markModified()
    closeDialog()
  }

  const handleSaveToLibrary = (name: string): void => {
    if (activeVisualStyle !== undefined) {
      addTemplate(name, activeVisualStyle)
    }
  }

  const handleApplyTemplate = (template: StyleTemplate): void => {
    handleCopyIn(template.name, template.visualStyle)
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
      <Tooltip title={`${activeEntry.name} — click to browse styles`}>
        <ButtonBase
          onClick={() => openDialogFor('picker')}
          data-testid="style-manager-picker-button"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            height: 30,
            px: 0.5,
            gap: 0.75,
            justifyContent: 'flex-start',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          {/* The live style, visible without opening anything. */}
          <Box
            sx={{
              width: 34,
              height: 22,
              flexShrink: 0,
              borderRadius: 0.5,
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {activeThumbnail !== undefined && (
              <Box
                component="img"
                src={activeThumbnail}
                alt=""
                data-testid="style-manager-active-thumbnail"
                sx={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
              />
            )}
          </Box>
          <Typography
            variant="body2"
            data-testid="style-manager-active-name"
            sx={{
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activeEntry.name}
          </Typography>
          <UnfoldMoreIcon
            fontSize="small"
            sx={{ ml: 'auto', color: 'action.active' }}
          />
        </ButtonBase>
      </Tooltip>
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
      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={closeMenu}
      >
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

      <StylePickerDialog
        open={dialog === 'picker'}
        networkId={networkId}
        onClose={closeDialog}
        onSwitch={(styleId) => {
          handleSwitch(styleId)
          closeDialog()
        }}
        onCopyIn={handleCopyIn}
        onRename={(styleId) => openDialogFor('rename', styleId)}
        onDuplicate={(styleId) => handleDuplicate(styleId)}
        onDelete={(styleId) => openDialogFor('delete', styleId)}
      />

      <StyleNameDialog
        open={dialog === 'create'}
        title="New Style"
        confirmLabel="Create"
        initialName="New Style"
        onConfirm={handleCreate}
        onClose={closeDialog}
      />
      <StyleNameDialog
        open={dialog === 'rename'}
        title="Rename Style"
        confirmLabel="Rename"
        initialName={effectiveTargetEntry.name}
        onConfirm={handleRename}
        onClose={closeDialog}
      />
      <StyleNameDialog
        open={dialog === 'saveToLibrary'}
        title="Save Style to Library"
        confirmLabel="Save"
        initialName={activeEntry.name}
        onConfirm={handleSaveToLibrary}
        onClose={closeDialog}
      />
      <Dialog
        open={dialog === 'delete'}
        onClose={closeDialog}
        data-testid="style-manager-delete-dialog"
      >
        <DialogTitle>Delete Style</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete the style &ldquo;{effectiveTargetEntry.name}&rdquo;? This
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDialog}
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
        onClose={closeDialog}
      />
    </Box>
  )
}
