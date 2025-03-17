import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useUndoStack, useUndoStack2 } from '../../../task/ApplyVisualStyle'
import { useUndoStore, useUndoStore2 } from '../../../store/UndoStore'

export const UndoMenuItem = (props: BaseMenuProps): ReactElement => {
  const [disabled, setDisabled] = useState<boolean>(true)
  const { undoLastEdit } = useUndoStack2()
  const undoStack = useUndoStore2((state) => state.undoStack)

  const handleUndo = (): void => {
    // TODO: ask user to confirm deletion
    undoLastEdit()
    props.handleClose()
  }

  return (
    <MenuItem disabled={undoStack.length === 0} onClick={handleUndo}>
      {`Undo ${undoStack[undoStack.length - 1]?.undoCommand ?? ''}`}
    </MenuItem>
  )
}
