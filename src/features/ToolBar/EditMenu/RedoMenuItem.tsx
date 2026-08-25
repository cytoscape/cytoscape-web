import RedoIcon from '@mui/icons-material/Redo'
import { ReactElement } from 'react'

import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../../data/hooks/stores/UndoStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../../data/hooks/useUndoStack'
import { IdType } from '../../../models'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const RedoMenuItem = (props: BaseMenuItemProps): ReactElement => {
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
    props.onClick()
  }

  const disabled = (undoRedoStack?.redoStack ?? []).length === 0
  const description =
    undoRedoStack?.redoStack?.[undoRedoStack.redoStack.length - 1]
      ?.description ?? ''

  return (
    <DropdownMenuItem
      label={disabled ? 'Redo' : `Redo - ${description}`}
      icon={<RedoIcon />}
      disabled={disabled}
      onClick={handleRedo}
    />
  )
}
