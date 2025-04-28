import { useCallback, useContext } from 'react'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import {
  Edge,
  EdgeView,
  IdType,
  NodeView,
  TableType,
  ValueType,
  ValueTypeName,
} from '../models'
import { VisualPropertyName, VisualStyle } from '../models/VisualStyleModel'

import { useUndoStore } from '../store/UndoStore'
import { UndoCommandType } from '../models/StoreModel/UndoStoreModel'
import { useViewModelStore } from '../store/ViewModelStore'
import { useTableStore } from '../store/TableStore'
import { useNetworkStore } from '../store/NetworkStore'
import { useUiStateStore } from '../store/UiStateStore'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { AppConfigContext } from '../AppConfigContext'

export const useUndoStack = () => {
  const setCellValue = useTableStore((state) => state.setValue)
  const setUndoStack = useUndoStore((state) => state.setUndoStack)
  const setRedoStack = useUndoStore((state) => state.setRedoStack)
  const setDefault = useVisualStyleStore((state) => state.setDefault)
  const setNodePosition = useViewModelStore((state) => state.setNodePosition)
  const updateNodePositions = useViewModelStore(
    (state) => state.updateNodePositions,
  )

  const addNodeViews = useViewModelStore((state) => state.addNodeViews)
  const addEdgeViews = useViewModelStore((state) => state.addEdgeViews)

  const deleteNodes = useNetworkStore((state) => state.deleteNodes)

  const setDiscreteMappingValue = useVisualStyleStore(
    (state) => state.setDiscreteMappingValue,
  )
  const deleteDiscreteMappingValue = useVisualStyleStore(
    (state) => state.deleteDiscreteMappingValue,
  )
  const setBypassMap = useVisualStyleStore((state) => state.setBypassMap)
  const setBypass = useVisualStyleStore((state) => state.setBypass)
  const deleteBypass = useVisualStyleStore((state) => state.deleteBypass)

  const setMapping = useVisualStyleStore((state) => state.setMapping)
  const createMapping = useVisualStyleStore((state) => state.createMapping)
  const setTable = useTableStore((state) => state.setTable)
  const setColumnName = useTableStore((state) => state.setColumnName)
  const addNodes = useNetworkStore((state) => state.addNodes)
  const addEdges = useNetworkStore((state) => state.addEdges)
  const editRows = useTableStore((state) => state.editRows)
  const setNetwork = useNetworkStore((state) => state.setNetwork)
  const deleteColumn = useTableStore((state) => state.deleteColumn)
  const addNodesAndEdges = useNetworkStore((state) => state.addNodesAndEdges)
  const setValues = useTableStore((state) => state.setValues)
  const { undoStackSize } = useContext(AppConfigContext)

  const activeNetworkView: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const activeNetworkViewTabIndex =
    useUiStateStore((state) => state.ui?.networkViewUi?.activeTabIndex) ?? 0

  const targetNetworkId: IdType =
    activeNetworkView === '' ? currentNetworkId : activeNetworkView

  const undoRedoStack = useUndoStore(
    (state) => state.undoRedoStacks[targetNetworkId],
  ) ?? { undoStack: [], redoStack: [] }

  const undoStack = undoRedoStack.undoStack
  const redoStack = undoRedoStack.redoStack

  const postEdit = useCallback(
    (
      undoCommand: UndoCommandType,
      description: string,
      undoParams: any[],
      redoParams: any[],
    ) => {
      // Get the latest undo stack for the current network

      const currentState = useUndoStore.getState()
      const currentNetworkStack = currentState.undoRedoStacks[
        targetNetworkId
      ] ?? { undoStack: [], redoStack: [] }
      const currentUndoStack = currentNetworkStack.undoStack

      const newEdit = { undoCommand, description, undoParams, redoParams }

      const nextUndoStack = [...currentUndoStack, newEdit].slice(-undoStackSize)

      setUndoStack(targetNetworkId, nextUndoStack)
      setRedoStack(targetNetworkId, [])
    },
    [
      targetNetworkId,
      setUndoStack,
      // undoStack,
      setRedoStack,
      // setDefault,
      // setNodePosition,
      // updateNodePositions,
    ],
  )

  const undoLastEdit = useCallback(() => {
    const commandMap = {
      [UndoCommandType.SET_CELL_VALUE]: (params: any[]) => {
        setCellValue(params[0], params[1], params[2], params[3], params[4])
      },
      [UndoCommandType.APPLY_VALUE_TO_COLUMN]: (params: any[]) => {
        setValues(params[0], params[1], params[2])
      },
      [UndoCommandType.APPLY_VALUE_TO_SELECTED]: (params: any[]) => {
        setValues(params[0], params[1], params[2])
      },
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
      [UndoCommandType.DELETE_EDGES]: (params: any[]) => {
        //TODO
        // addEdges(params[0], params[1])
        // editRows(params[0], params[1], params[2])
      },
      [UndoCommandType.DELETE_NODES]: (params: any[]) => {
        console.log('Delete nodes PARAMS', params)
        // setNetwork(params[0], params[1])
        // setTable(params[0], 'node', params[2])
        // setTable(params[0], 'edge', params[3])
        const networkId: IdType = params[0]
        const nodeIds: IdType[] = params[1]
        const deletedEdges: Edge[] = params[2]
        const deletedNodeViewModels: NodeView[] = params[3]
        const deletedEdgeViewModels: EdgeView[] = params[4]
        const deletedNodeRows: Map<
          IdType,
          Record<string, ValueType>
        > = params[5]
        const deletedEdgeRows: Map<
          IdType,
          Record<string, ValueType>
        > = params[6]
        // const deletedBypasses: Record<VisualPropertyName, Map<IdType, ValueType>> = params[7]

        // 1. Add back the deleted nodes and connected edges
        addNodesAndEdges(networkId, nodeIds, deletedEdges)
        console.log('Nodes and edges added', nodeIds, deletedEdges)

        // 2. Restore table rows
        if (deletedNodeRows.size > 0) {
          editRows(networkId, TableType.NODE, deletedNodeRows)
        }
        if (deletedEdgeRows.size > 0) {
          editRows(networkId, TableType.EDGE, deletedEdgeRows)
        }

        // 3. Restore view models
        if (deletedNodeViewModels.length > 0) {
          addNodeViews(networkId, deletedNodeViewModels)
        }
        if (deletedEdgeViewModels.length > 0) {
          addEdgeViews(networkId, deletedEdgeViewModels)
        }

        // editRows(params[0], 'node', params[2])
        // editRows(params[0], 'edge', params[4])
      },

      [UndoCommandType.MOVE_NODES]: (params: any[]) => {
        const networkId: IdType = params[0]
        const nodeId: IdType = params[1]
        const nodePositions: [number, number] = params[2]
        console.log('UNDO MOVE', params)
        setNodePosition(networkId, nodeId, nodePositions)
      },

      [UndoCommandType.SET_BYPASS]: (params: any[]) => {
        setBypassMap(params[0], params[1], params[2])
      },
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
      [UndoCommandType.CREATE_MAPPING]: (params: any[]) => {
        setMapping(params[0], params[1], undefined)
      },
      [UndoCommandType.DELETE_BYPASS]: (params: any[]) => {
        setBypass(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.DELETE_BYPASS_MAP]: (params: any[]) => {
        setBypassMap(params[0], params[1], params[2])
      },
      [UndoCommandType.DELETE_DISCRETE_VALUE]: (params: any[]) => {
        setDiscreteMappingValue(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.DELETE_DISCRETE_VALUE_MAP]: (params: any[]) => {
        setMapping(params[0], params[1], params[2])
      },
    }

    const lastEdit = undoStack[undoStack.length - 1]
    const nextUndoStack = undoStack.slice(0, undoStack.length - 1)
    if (lastEdit) {
      const undoCommand = commandMap[lastEdit.undoCommand]
      undoCommand(lastEdit.undoParams)
      setRedoStack(targetNetworkId, [...redoStack, lastEdit])
      setUndoStack(targetNetworkId, nextUndoStack)
    }
  }, [
    targetNetworkId,
    setValues,
    setCellValue,
    setDefault,
    undoStack,
    redoStack,
    setUndoStack,
    setRedoStack,
    setNodePosition,
    updateNodePositions,
    setMapping,
    setDiscreteMappingValue,
    deleteDiscreteMappingValue,
    setBypass,
    setBypassMap,
    setTable,
    setColumnName,
    addEdges,
    addNodes,
    editRows,
    setNetwork,
  ])

  const redoLastEdit = useCallback(() => {
    const commandMap = {
      [UndoCommandType.SET_CELL_VALUE]: (params: any[]) => {
        setCellValue(params[0], params[1], params[2], params[3], params[4])
      },
      [UndoCommandType.APPLY_VALUE_TO_COLUMN]: (params: any[]) => {
        setValues(params[0], params[1], params[2])
      },
      [UndoCommandType.APPLY_VALUE_TO_SELECTED]: (params: any[]) => {
        setValues(params[0], params[1], params[2])
      },
      [UndoCommandType.SET_DEFAULT_VP_VALUE]: (params: any[]) => {
        setDefault(params[0], params[1], params[2])
      },
      [UndoCommandType.APPLY_LAYOUT]: (params: any[]) => {
        updateNodePositions(params[0], params[1])
      },
      [UndoCommandType.DELETE_COLUMN]: (params: any[]) => {
        deleteColumn(params[0], params[1], params[3].id)
      },
      [UndoCommandType.RENAME_COLUMN]: (params: any[]) => {
        setColumnName(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.DELETE_EDGES]: (params: any[]) => {
        //TODO
        // addEdges(params[0], params[1])
        // editRows(params[0], params[1], params[2])
      },
      [UndoCommandType.DELETE_NODES]: (params: any[]) => {
        // TODO
        // // console.log('PARAMS', params)
        // // setNetwork(params[0], params[1])
        // // setTable(params[0], 'node', params[2])
        // // setTable(params[0], 'edge', params[3])
        // addNodesAndEdges(params[0], params[1], params[3])
        // // addNodes(params[0], params[1])
        // editRows(params[0], 'node', params[2])
        // // addEdges(params[0], params[3])
        // editRows(params[0], 'edge', params[4])

        // Redo means we need to delete the nodes again
        const networkId: IdType = params[0]
        const nodeIds: IdType[] = params[1]
        // const deletedEdges: Edge[] = params[2]

        deleteNodes(networkId, nodeIds)
      },
      [UndoCommandType.MOVE_NODES]: (params: any[]) => {
        const networkId: IdType = params[0]
        const nodeId: IdType = params[1]
        const nodePositions: [number, number] = params[2]
        setNodePosition(networkId, nodeId, nodePositions)
      },
      [UndoCommandType.SET_BYPASS]: (params: any[]) => {
        setBypass(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.SET_BYPASS_MAP]: (params: any[]) => {
        setBypass(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.SET_DISCRETE_VALUE]: (params: any[]) => {
        setDiscreteMappingValue(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.SET_DISCRETE_VALUE_MAP]: (params: any[]) => {
        setDiscreteMappingValue(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.DELETE_DISCRETE_VALUE_MAP]: (params: any[]) => {
        deleteDiscreteMappingValue(params[0], params[1], params[2])
      },
      [UndoCommandType.SET_MAPPING_COLUMN]: (params: any[]) => {
        createMapping(
          params[0],
          params[1],
          params[2],
          params[3],
          params[4],
          params[5],
          params[6],
        )
      },
      [UndoCommandType.SET_MAPPING_TYPE]: (params: any[]) => {
        createMapping(
          params[0],
          params[1],
          params[2],
          params[3],
          params[4],
          params[5],
          params[6],
        )
      },
      [UndoCommandType.REMOVE_MAPPING]: (params: any[]) => {
        setMapping(params[0], params[1], undefined)
      },
      [UndoCommandType.SET_LAYOUT_SCALE]: (params: any[]) => {},
      [UndoCommandType.FIT_CONTENT]: (params: any[]) => {},
      [UndoCommandType.CREATE_MAPPING]: (params: any[]) => {
        createMapping(
          params[0],
          params[1],
          params[2],
          params[3],
          params[4],
          params[5],
          params[6],
        )
      },
      [UndoCommandType.DELETE_BYPASS]: (params: any[]) => {
        deleteBypass(params[0], params[1], params[2])
      },
      [UndoCommandType.DELETE_BYPASS_MAP]: (params: any[]) => {
        setBypassMap(params[0], params[1], new Map())
      },
      [UndoCommandType.DELETE_DISCRETE_VALUE]: (params: any[]) => {
        deleteDiscreteMappingValue(params[0], params[1], params[2])
      },
    }
    const lastEdit = redoStack[redoStack.length - 1]
    const nextRedoStack = redoStack.slice(0, redoStack.length - 1)
    if (lastEdit) {
      const undoCommand = commandMap[lastEdit.undoCommand]

      if (undoCommand) {
        undoCommand(lastEdit.redoParams)
        setRedoStack(targetNetworkId, nextRedoStack)
        setUndoStack(targetNetworkId, [...undoStack, lastEdit])
      }
    }
  }, [
    redoStack,
    undoStack,
    targetNetworkId,
    setValues,
    setCellValue,
    setDefault,
    setUndoStack,
    setRedoStack,
    setNodePosition,
    updateNodePositions,
    createMapping,
    setMapping,
    setDiscreteMappingValue,
    deleteDiscreteMappingValue,
    deleteBypass,
    setBypassMap,
    setBypass,
    setTable,
    setColumnName,
    addEdges,
    addNodes,
    editRows,
    setNetwork,
    deleteColumn,
  ])

  const clearStack = useCallback(() => {}, [])

  return { undoStack, postEdit, undoLastEdit, redoLastEdit, clearStack }
}
