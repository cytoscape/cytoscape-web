import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../../data/hooks/stores/UndoStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { IdType } from '../../../models'
import { BaseMenuProps } from '../BaseMenuProps'

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
