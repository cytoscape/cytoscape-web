import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useUndoStack } from '../../../task/UndoStack'
import { useUndoStore } from '../../../store/UndoStore'
import { IdType } from '../../../models'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'

export const RedoMenuItem = (props: BaseMenuProps): ReactElement => {
  const { redoLastEdit } = useUndoStack()
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

  const handleRedo = (): void => {
    // TODO: ask user to confirm deletion
    redoLastEdit()
    props.handleClose()
  }

  const disabled = (undoRedoStack?.redoStack ?? []).length === 0
  const description =
    undoRedoStack?.redoStack?.[undoRedoStack.redoStack.length - 1]
      ?.description ?? ''

  return (
    <MenuItem disabled={disabled} onClick={handleRedo}>
      {disabled ? 'Redo' : `Redo - ${description}`}
    </MenuItem>
  )
}
