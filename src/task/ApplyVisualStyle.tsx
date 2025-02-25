import { useCallback } from 'react'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { IdType, ValueTypeName } from '../models'
import { VisualPropertyName, VisualStyle } from '../models/VisualStyleModel'

import { useUndoStore } from '../store/UndoStore'
import { UndoCommandType } from '../models/StoreModel/UndoStoreModel'
import { useViewModelStore } from '../store/ViewModelStore'


/**
 * A custom hook that returns a function to apply a Visual Style
 * to a given network in the store.
 */
export const useApplyVisualStyle = (): ((
  networkId: IdType,
  style: VisualStyle,
) => void) => {
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const createPassthroughMapping = useVisualStyleStore(
    (state) => state.createPassthroughMapping,
  )

  const applyVisualStyle = useCallback(
    (networkId: IdType, style: VisualStyle) => {
      // Update or add the style in the VisualStyle store
      addVisualStyle(networkId, style)

      // Optionally set up a default label mapping (similar to createNetworkWithView)
      createPassthroughMapping(
        networkId,
        VisualPropertyName.NodeLabel,
        'name',
        ValueTypeName.String,
      )
    },
    [addVisualStyle, createPassthroughMapping],
  )

  return applyVisualStyle
}

export const useUndoStack = () => {
  // const [undoStack, setUndoStack] = useState<Edit[]>([])
  // const [redoStack, setRedoStack] = useState<Edit[]>([])
  const undoStack = useUndoStore((state) => state.undoStack)
  const redoStack = useUndoStore((state) => state.redoStack)
  const setUndoStack = useUndoStore((state) => state.setUndoStack)
  const setRedoStack = useUndoStore((state) => state.setRedoStack)
  const setDefault = useVisualStyleStore((state) => state.setDefault)
  const setNodePosition = useViewModelStore((state) => state.setNodePosition)
  const updateNodePositions = useViewModelStore((state) => state.updateNodePositions)

  const postEdit = useCallback((undoCommand: UndoCommandType, params: any[]) => {
    const nextUndoStack = [...undoStack, { undoCommand, params }]
    
    console.log('before UNDO', undoStack)
    console.log('NEW UNDO', nextUndoStack)
    setUndoStack(nextUndoStack)
    setRedoStack([]) // Clear redo stack on new edit
  }, [setUndoStack, undoStack, setRedoStack, setDefault, setNodePosition, updateNodePositions])

  const undoLastEdit = useCallback(() => {

    const commandMap = {
      [UndoCommandType.SET_DEFAULT_VP_VALUE]: (params: any[]) => {
        setDefault(params[0], params[1], params[2])
      },
      [UndoCommandType.APPLY_LAYOUT]: (params: any[]) => {
        updateNodePositions(params[0], params[1])
      },
      [UndoCommandType.DELETE_COLUMN]: (params: any[]) => {
        // Add node undo logic here
      },
      [UndoCommandType.DELETE_EDGES]: (params: any[]) => {
        // Remove node undo logic here
      },
      [UndoCommandType.DELETE_NODES]: (params: any[]) => {
        // Update edge undo logic here
      },
      [UndoCommandType.MOVE_NODES]: (params: any[]) => {
        // Remove edge undo logic here
        setNodePosition(params[0], params[1], params[2])

      },
      [UndoCommandType.RENAME_COLUMN]: (params: any[]) => {
        // Remove edge undo logic here
      },
      [UndoCommandType.SET_BYPASS]: (params: any[]) => {
        // Remove edge undo logic here
      },
      [UndoCommandType.SET_DISCRETE_VALUE]: (params: any[]) => {
        // Remove edge undo logic here
      },
      [UndoCommandType.SET_MAPPING_COLUMN]: (params: any[]) => {
        // Remove edge undo logic here
      },
      [UndoCommandType.SET_MAPPING_TYPE]: (params: any[]) => {
        // Remove edge undo logic here
      },
      [UndoCommandType.SET_LAYOUT_SCALE]: (params: any[]) => {
        // Remove edge undo logic here
      },
      [UndoCommandType.FIT_CONTENT]: (params: any[]) => {
        // Remove edge undo logic here
      },
    }


    const lastEdit = undoStack[undoStack.length - 1]
    const nextUndoStack = undoStack.slice(0, undoStack.length - 1)
    console.log('AFTER POP', nextUndoStack, undoStack)
    if (lastEdit) {
      const undoCommand = commandMap[lastEdit.undoCommand]
      undoCommand(lastEdit.params)
      console.log('UNDO',lastEdit)
      setRedoStack([...redoStack, lastEdit])
      setUndoStack(nextUndoStack)
    }

  }, [setDefault, undoStack, redoStack, setUndoStack, setRedoStack, setNodePosition, updateNodePositions])




  // const postEdit = useCallback((networkId: IdType, undo: () => void) => {
  //   setDefault(networkId, VisualPropertyName.NodeLabel, 'name')
  //   setUndoStack((prevStack) => [...prevStack, { networkId, undo }])
  //   setRedoStack([]) // Clear redo stack on new edit
  //   console.log(undoStack)
  // }, [])

  // const undoLastEdit = useCallback(() => {
  //   const lastEdit = undoStack.pop()
  //   if (lastEdit) {
  //     lastEdit.undo()
  //     setUndoStack((prevUndoStack) => [...prevUndoStack, lastEdit])
  //   }
  //   // setUndoStack((prevStack) => {
  //   //   const lastEdit = prevStack.pop()
  //   //   if (lastEdit) {
  //   //     lastEdit.undo()
  //   //     setRedoStack((prevRedoStack) => [...prevRedoStack, lastEdit])
  //   //   }
  //   //   return [...prevStack]
  //   // })
  // }, [])

  const redoLastEdit = useCallback(() => {
    // const lastEdit = undoStack.pop()
    // if (lastEdit) {
    //   lastEdit.undo()
    //   setUndoStack((prevUndoStack) => [...prevUndoStack, lastEdit])
    // }

    // setRedoStack((prevStack) => {
    //   // const lastEdit = prevStack.pop()
    //   // if (lastEdit) {
    //   //   lastEdit.undo() // Assuming undo function can be used to redo as well
    //   //   setUndoStack((prevUndoStack) => [...prevUndoStack, lastEdit])
    //   // }
    //   // return [...prevStack]
    // })
  }, [])

  const clearStack = useCallback(() => {
    setUndoStack([])
    setRedoStack([])
  }, [])

  return { postEdit, undoLastEdit, redoLastEdit, clearStack }
}

