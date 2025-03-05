import { useCallback } from 'react'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { IdType, ValueTypeName } from '../models'
import { VisualPropertyName, VisualStyle } from '../models/VisualStyleModel'

import { useUndoStore } from '../store/UndoStore'
import { UndoCommandType } from '../models/StoreModel/UndoStoreModel'
import { useViewModelStore } from '../store/ViewModelStore'
import { useTableStore } from '../store/TableStore'

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
  const updateNodePositions = useViewModelStore(
    (state) => state.updateNodePositions,
  )
  const setDiscreteMappingValue = useVisualStyleStore(
    (state) => state.setDiscreteMappingValue,
  )
  const setBypassMap = useVisualStyleStore((state) => state.setBypassMap)

  const setMapping = useVisualStyleStore((state) => state.setMapping)
  const setTable = useTableStore((state) => state.setTable)
  const setColumnName = useTableStore((state) => state.setColumnName)

  const postEdit = useCallback(
    (undoCommand: UndoCommandType, params: any[]) => {
      const nextUndoStack = [...undoStack, { undoCommand, params }]

      console.log('before UNDO', undoStack)
      console.log('NEW UNDO', nextUndoStack)
      setUndoStack(nextUndoStack)
      setRedoStack([]) // Clear redo stack on new edit
    },
    [
      setUndoStack,
      undoStack,
      setRedoStack,
      setDefault,
      setNodePosition,
      updateNodePositions,
    ],
  )

  const undoLastEdit = useCallback(() => {
    const commandMap = {
      [UndoCommandType.SET_DEFAULT_VP_VALUE]: (params: any[]) => {
        setDefault(params[0], params[1], params[2])
      },
      [UndoCommandType.APPLY_LAYOUT]: (params: any[]) => {
        updateNodePositions(params[0], params[1])
      },
      [UndoCommandType.DELETE_COLUMN]: (params: any[]) => {
        setTable(params[0], params[1], params[2])
      },
      [UndoCommandType.RENAME_COLUMN]: (params: any[]) => {
        setColumnName(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.DELETE_EDGES]: (params: any[]) => {},
      [UndoCommandType.DELETE_NODES]: (params: any[]) => {},
      [UndoCommandType.MOVE_NODES]: (params: any[]) => {
        setNodePosition(params[0], params[1], params[2])
      },
      [UndoCommandType.SET_BYPASS]: (params: any[]) => {},
      [UndoCommandType.SET_BYPASS_MAP]: (params: any[]) => {
        setBypassMap(params[0], params[1], params[2])
      },
      [UndoCommandType.SET_DISCRETE_VALUE]: (params: any[]) => {
        setDiscreteMappingValue(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.SET_DISCRETE_VALUE_MAP]: (params: any[]) => {
        setMapping(params[0], params[1], params[2])
      },
      [UndoCommandType.SET_MAPPING_COLUMN]: (params: any[]) => {
        setMapping(params[0], params[1], params[2])
      },
      [UndoCommandType.SET_MAPPING_TYPE]: (params: any[]) => {
        setMapping(params[0], params[1], params[2])
      },
      [UndoCommandType.REMOVE_MAPPING]: (params: any[]) => {
        setMapping(params[0], params[1], params[2])
      },
      [UndoCommandType.SET_LAYOUT_SCALE]: (params: any[]) => {},
      [UndoCommandType.FIT_CONTENT]: (params: any[]) => {},
    }

    const lastEdit = undoStack[undoStack.length - 1]
    const nextUndoStack = undoStack.slice(0, undoStack.length - 1)
    console.log('AFTER POP', nextUndoStack, undoStack)
    if (lastEdit) {
      const undoCommand = commandMap[lastEdit.undoCommand]
      undoCommand(lastEdit.params)
      console.log('UNDO', lastEdit)
      setRedoStack([...redoStack, lastEdit])
      setUndoStack(nextUndoStack)
    }
  }, [
    setDefault,
    undoStack,
    redoStack,
    setUndoStack,
    setRedoStack,
    setNodePosition,
    updateNodePositions,
    setMapping,
    setDiscreteMappingValue,
    setBypassMap,
    setTable,
    setColumnName,
  ])

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
