import { MenuItem } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useUndoStack } from '../../../task/ApplyVisualStyle'
import { useUndoStore } from '../../../store/UndoStore'

export const UndoMenuItem = (
    props: BaseMenuProps,
): ReactElement => {
    const [disabled, setDisabled] = useState<boolean>(true)
    const { undoLastEdit } = useUndoStack()
    const undoStack = useUndoStore((state) => state.undoStack)

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
