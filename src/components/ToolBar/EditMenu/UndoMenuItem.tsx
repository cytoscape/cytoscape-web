import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useUndoStack } from '../../../task/UndoStack'
import { useUndoStore } from '../../../store/UndoStore'
import { IdType } from '../../../models'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'

export const UndoMenuItem = (props: BaseMenuProps): ReactElement => {
  const { undoLastEdit } = useUndoStack()
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const targetNetworkId: IdType =
    activeNetworkId === undefined || activeNetworkId === ''
      ? currentNetworkId
      : activeNetworkId

  const undoRedoStack = useUndoStore(
    (state) => state.undoRedoStacks[targetNetworkId],
  ) ?? { undoStack: [], redoStack: [] }

  const handleUndo = (): void => {
    undoLastEdit()
    props.handleClose()
  }

  const disabled = (undoRedoStack?.undoStack ?? []).length === 0
  const description =
    undoRedoStack?.undoStack?.[undoRedoStack.undoStack.length - 1]
      ?.description ?? ''

  return (
    <MenuItem disabled={disabled} onClick={handleUndo}>
      {disabled ? 'Undo' : `Undo - ${description}`}
    </MenuItem>
  )
}
