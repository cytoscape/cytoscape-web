import { useCallback, useContext } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { logHistory } from '../../debug'
import {
  Edge,
  EdgeView,
  IdType,
  NodeView,
  TableType,
  ValueType,
} from '../../models'
import {
  createEdgesCore,
  type CreateEdgesParams,
  createNodesCore,
  type CreateNodesParams,
  deleteEdgesCore,
  deleteNodesCore,
  type EdgeOperationStoreActions,
  type NodeOperationStoreActions,
} from '../../models/CyNetworkModel'
import { DEFAULT_RENDERER_ID } from '../../models/RendererModel/impl/defaultRenderer'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useRendererFunctionStore } from './stores/RendererFunctionStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'

export const useUndoStack = () => {
  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)
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

  // Store actions for delete operations
  const deleteNodesFromNetwork = useNetworkStore((state) => state.deleteNodes)
  const deleteEdgesFromNetwork = useNetworkStore((state) => state.deleteEdges)
  const deleteRows = useTableStore((state) => state.deleteRows)
  const deleteViewObjects = useViewModelStore((state) => state.deleteObjects)

  // Store actions for create operations
  const addNode = useNetworkStore((state) => state.addNode)
  const addEdge = useNetworkStore((state) => state.addEdge)
  const addNodeView = useViewModelStore((state) => state.addNodeView)
  const addEdgeView = useViewModelStore((state) => state.addEdgeView)
  const networks = useNetworkStore((state) => state.networks)
  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)

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
  const switchStyle = useVisualStyleStore((state) => state.switchStyle)
  const setTable = useTableStore((state) => state.setTable)
  const setColumnName = useTableStore((state) => state.setColumnName)
  const addEdges = useNetworkStore((state) => state.addEdges)
  const editRows = useTableStore((state) => state.editRows)
  const deleteColumn = useTableStore((state) => state.deleteColumn)
  const addNodesAndEdges = useNetworkStore((state) => state.addNodesAndEdges)
  const setValues = useTableStore((state) => state.setValues)
  const { undoStackSize } = useContext(AppConfigContext)

  // ID of the network on focus (can be different from the main network)
  const activeNetworkViewId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const targetNetworkId: IdType =
    activeNetworkViewId === '' ? currentNetworkId : activeNetworkViewId

  const undoRedoStack = useUndoStore(
    (state) => state.undoRedoStacks[targetNetworkId],
  ) ?? { undoStack: [], redoStack: [] }

  const undoStack = undoRedoStack.undoStack

  /**
   * Replay a style switch, failing loudly when the target style is gone.
   *
   * switchStyle() only logs a warning and no-ops on an unknown style. Returning
   * quietly would let the framework move the edit onto the redo stack as though
   * it had worked, and every older edit in the stack would then be replayed
   * against whichever style happened to be active. Throwing routes into the
   * command runner's catch, which logs and discards the edit (REVIEW.md B5).
   */
  const switchStyleOrThrow = useCallback(
    (networkId: IdType, styleId: IdType) => {
      if (!switchStyle(networkId, styleId)) {
        throw new Error(`Cannot switch network ${networkId} to style ${styleId}`)
      }
    },
    [switchStyle],
  )

  const postEdit = useCallback(
    (
      undoCommand: UndoCommandType,
      description: string,
      undoParams: any[],
      redoParams: any[],
      /**
       * Network whose stack this edit belongs on. Defaults to the focused
       * network, which is right for edits driven by the current view.
       *
       * Pass it when the caller already knows which network it mutated. The
       * default is derived from live store state, while a component's own
       * notion of its target network is often useEffect-derived state — for one
       * render after the focus changes the two disagree, and the edit would be
       * filed against a network it did not touch.
       */
      networkId?: IdType,
    ) => {
      // Get the LATEST targetNetworkId at the moment of execution
      // This is necessary to avoid "stale closure" issues
      const latestUiState = useUiStateStore.getState()
      const latestWorkspaceState = useWorkspaceStore.getState()
      const latestActiveNetworkViewId = latestUiState.ui.activeNetworkView
      const latestCurrentNetworkId =
        latestWorkspaceState.workspace.currentNetworkId
      const currentTargetNetworkId =
        networkId ??
        (latestActiveNetworkViewId === ''
          ? latestCurrentNetworkId
          : latestActiveNetworkViewId)

      // Get the latest undo stack for the current network
      const currentState = useUndoStore.getState()
      const currentNetworkStack = currentState.undoRedoStacks[
        currentTargetNetworkId // Use the latest targetNetworkId
      ] ?? { undoStack: [], redoStack: [] }
      const currentUndoStack = currentNetworkStack.undoStack

      const newEdit = { undoCommand, description, undoParams, redoParams }

      // slice(-0) === slice(0), so a size of 0 must be handled explicitly:
      // it disables undo rather than unbounding the stack (REVIEW.md B10)
      const nextUndoStack =
        undoStackSize > 0
          ? [...currentUndoStack, newEdit].slice(-undoStackSize)
          : []

      setUndoStack(currentTargetNetworkId, nextUndoStack)
      setRedoStack(currentTargetNetworkId, [])
    },
    [setUndoStack, setRedoStack, undoStackSize],
  )

  const undoLastEdit = useCallback(() => {
    const commandMap = {
      [UndoCommandType.SET_NETWORK_SUMMARY]: (params: any[]) => {
        updateNetworkSummary(params[0], params[1])
      },
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
        const networkId = params[0]
        const positions = params[1]

        // Update node positions
        updateNodePositions(networkId, positions)

        // Fit viewport to center the layout
        const fitFunction = useRendererFunctionStore
          .getState()
          .getFunction(DEFAULT_RENDERER_ID, 'fit', networkId)
        if (fitFunction) {
          fitFunction()
        }
      },
      [UndoCommandType.DELETE_COLUMN]: (params: any[]) => {
        setTable(params[0], params[1], params[2])
      },
      [UndoCommandType.RENAME_COLUMN]: (params: any[]) => {
        setColumnName(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.DELETE_EDGES]: (params: any[]) => {
        // Undo function for deleting edges
        const networkId: IdType = params[0]
        const deletedEdges: Edge[] = params[1]
        const deletedEdgeViewModels: EdgeView[] = params[2]
        const deletedEdgeRows: Map<
          IdType,
          Record<string, ValueType>
        > = params[3]
        const deletedBypasses: Map<
          VisualPropertyName,
          Map<IdType, any>
        > = params[4] || new Map()

        // 1. Add back the deleted edges
        addEdges(networkId, deletedEdges)

        // 2. Restore table rows
        if (deletedEdgeRows.size > 0) {
          editRows(networkId, TableType.EDGE, deletedEdgeRows)
        }

        // 3. Restore view models
        if (deletedEdgeViewModels.length > 0) {
          addEdgeViews(networkId, deletedEdgeViewModels)
        }

        // 4. Restore visual style bypasses
        deletedBypasses.forEach((bypassMap, vpName) => {
          setBypassMap(networkId, vpName, bypassMap)
        })

        // 5. Restore network summary counts (get network after restoration)
        const network = useNetworkStore.getState().networks.get(networkId)
        if (network) {
          updateNetworkSummary(networkId, {
            nodeCount: network.nodes.length,
            edgeCount: network.edges.length,
          })
        }
      },
      [UndoCommandType.DELETE_NODES]: (params: any[]) => {
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
        const deletedBypasses: Map<
          VisualPropertyName,
          Map<IdType, any>
        > = params[7] || new Map()

        // 1. Add back the deleted nodes and connected edges
        addNodesAndEdges(networkId, nodeIds, deletedEdges)

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

        // 4. Restore visual style bypasses
        deletedBypasses.forEach((bypassMap, vpName) => {
          setBypassMap(networkId, vpName, bypassMap)
        })

        // 5. Restore network summary counts (get network after restoration)
        const network = useNetworkStore.getState().networks.get(networkId)
        if (network) {
          updateNetworkSummary(networkId, {
            nodeCount: network.nodes.length,
            edgeCount: network.edges.length,
          })
        }
      },
      [UndoCommandType.CREATE_NODES]: (params: any[]) => {
        // Undo node creation by deleting the created nodes
        const networkId: IdType = params[0]
        const nodeIds: IdType[] = params[1]

        // Get fresh network state from store
        const network = useNetworkStore.getState().networks.get(networkId)
        if (!network) {
          throw new Error(`Network ${networkId} not found`)
        }

        // Build store actions object
        const storeActions: NodeOperationStoreActions = {
          deleteNodesFromNetwork,
          addNode,
          deleteRows,
          editRows,
          deleteViewObjects,
          addNodeView,
          updateNetworkSummary,
          networks,
          tables,
          viewModels,
          visualStyles,
        }

        // Use the pure function to delete nodes
        deleteNodesCore(networkId, nodeIds, network, storeActions)
      },
      [UndoCommandType.CREATE_EDGES]: (params: any[]) => {
        // Undo edge creation by deleting the created edges
        const networkId: IdType = params[0]
        const edgeIds: IdType[] = params[1]

        // Get fresh network state from store
        const network = useNetworkStore.getState().networks.get(networkId)
        if (!network) {
          throw new Error(`Network ${networkId} not found`)
        }

        // Build store actions object
        const storeActions: EdgeOperationStoreActions = {
          deleteEdgesFromNetwork,
          addEdge,
          deleteRows,
          editRows,
          deleteViewObjects,
          addEdgeView,
          updateNetworkSummary,
          networks,
          tables,
          viewModels,
          visualStyles,
        }

        // Use the pure function to delete edges
        deleteEdgesCore(networkId, edgeIds, network, storeActions)
      },

      [UndoCommandType.MOVE_NODES]: (params: any[]) => {
        const networkId: IdType = params[0]
        const nodeId: IdType = params[1]
        const nodePositions: [number, number] = params[2]
        setNodePosition(networkId, nodeId, nodePositions)
      },
      [UndoCommandType.MOVE_EDGES]: (params: any[]) => {
        useNetworkStore
          .getState()
          .moveEdge(params[0], params[1], params[2], params[3])
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
      [UndoCommandType.SET_CONTINUOUS_MAPPING]: (params: any[]) => {
        setMapping(params[0], params[1], params[2])
      },
      [UndoCommandType.SWITCH_STYLE]: (params: any[]) => {
        switchStyleOrThrow(params[0], params[1])
      },
    }

    // Read the LATEST state at execution time — the render-captured
    // undoStack/targetNetworkId are stale when undo is invoked twice
    // before a re-render (REVIEW.md B4; postEdit was already fixed
    // this way)
    const latestActiveNetworkViewId =
      useUiStateStore.getState().ui.activeNetworkView
    const latestTargetNetworkId =
      latestActiveNetworkViewId === ''
        ? useWorkspaceStore.getState().workspace.currentNetworkId
        : latestActiveNetworkViewId
    const latestStacks = useUndoStore.getState().undoRedoStacks[
      latestTargetNetworkId
    ] ?? { undoStack: [], redoStack: [] }
    const latestUndoStack = latestStacks.undoStack
    const latestRedoStack = latestStacks.redoStack

    const lastEdit = latestUndoStack[latestUndoStack.length - 1]
    const nextUndoStack = latestUndoStack.slice(0, latestUndoStack.length - 1)
    if (lastEdit) {
      const undoCommand = commandMap[lastEdit.undoCommand]
      if (undoCommand === undefined) {
        // A stack persisted by a different app version can contain a
        // command this build does not know. Discard the edit so the
        // stack is not wedged (REVIEW.md B5)
        logHistory.warn(
          `[useUndoStack] Discarding edit with unknown undo command: ${String(lastEdit.undoCommand)}`,
        )
        setUndoStack(latestTargetNetworkId, nextUndoStack)
        return
      }
      try {
        undoCommand(lastEdit.undoParams)
      } catch (e) {
        // A failing command (e.g. its network no longer exists) must not
        // escape into the click handler or wedge the stack; pop the edit
        // and do NOT move it to redo (its state is unknown) (REVIEW.md B5)
        logHistory.warn('[useUndoStack] Undo command failed; discarding edit:', e)
        setUndoStack(latestTargetNetworkId, nextUndoStack)
        return
      }
      setRedoStack(latestTargetNetworkId, [...latestRedoStack, lastEdit])
      setUndoStack(latestTargetNetworkId, nextUndoStack)
    }
  }, [
    updateNetworkSummary,
    setValues,
    setCellValue,
    setDefault,
    setUndoStack,
    setRedoStack,
    setNodePosition,
    updateNodePositions,
    setMapping,
    setDiscreteMappingValue,
    setBypass,
    setBypassMap,
    setTable,
    setColumnName,
    addEdges,
    editRows,
    deleteNodesFromNetwork,
    deleteEdgesFromNetwork,
    deleteRows,
    deleteViewObjects,
    addNode,
    addEdge,
    addNodeView,
    addEdgeView,
    networks,
    tables,
    viewModels,
    visualStyles,
    addNodeViews,
    addEdgeViews,
    addNodesAndEdges,
    switchStyleOrThrow,
  ])

  const redoLastEdit = useCallback(() => {
    const commandMap = {
      [UndoCommandType.SET_NETWORK_SUMMARY]: (params: any[]) => {
        updateNetworkSummary(params[0], params[1])
      },
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
        const networkId = params[0]
        const positions = params[1]

        // Update node positions
        updateNodePositions(networkId, positions)

        // Fit viewport to center the layout
        const fitFunction = useRendererFunctionStore
          .getState()
          .getFunction(DEFAULT_RENDERER_ID, 'fit', networkId)
        if (fitFunction) {
          fitFunction()
        }
      },
      [UndoCommandType.DELETE_COLUMN]: (params: any[]) => {
        deleteColumn(params[0], params[1], params[3].id)
      },
      [UndoCommandType.RENAME_COLUMN]: (params: any[]) => {
        setColumnName(params[0], params[1], params[2], params[3])
      },
      [UndoCommandType.DELETE_EDGES]: (params: any[]) => {
        // Redo edge deletion
        const networkId: IdType = params[0]
        const edgeIds: IdType[] = params[1]

        // Get fresh network state from store
        const network = useNetworkStore.getState().networks.get(networkId)
        if (!network) {
          throw new Error(`Network ${networkId} not found`)
        }

        // Build store actions object
        const storeActions: EdgeOperationStoreActions = {
          deleteEdgesFromNetwork,
          addEdge,
          deleteRows,
          editRows,
          deleteViewObjects,
          addEdgeView,
          updateNetworkSummary,
          networks,
          tables,
          viewModels,
          visualStyles,
        }

        // Use the pure function to delete edges
        deleteEdgesCore(networkId, edgeIds, network, storeActions)
      },
      [UndoCommandType.DELETE_NODES]: (params: any[]) => {
        // Redo node deletion
        const networkId: IdType = params[0]
        const nodeIds: IdType[] = params[1]

        // Get fresh network state from store
        const network = useNetworkStore.getState().networks.get(networkId)
        if (!network) {
          throw new Error(`Network ${networkId} not found`)
        }

        // Build store actions object
        const storeActions: NodeOperationStoreActions = {
          deleteNodesFromNetwork,
          addNode,
          deleteRows,
          editRows,
          deleteViewObjects,
          addNodeView,
          updateNetworkSummary,
          networks,
          tables,
          viewModels,
          visualStyles,
        }

        // Use the pure function to delete nodes
        deleteNodesCore(networkId, nodeIds, network, storeActions)
      },
      [UndoCommandType.CREATE_NODES]: (params: any[]) => {
        // Redo node creation
        const paramsObj: CreateNodesParams = {
          networkId: params[0],
          nodeIds: params[1],
          position: params[2],
          attributes: params[3],
        }

        // Build store actions object
        const storeActions: NodeOperationStoreActions = {
          deleteNodesFromNetwork,
          addNode,
          deleteRows,
          editRows,
          deleteViewObjects,
          addNodeView,
          updateNetworkSummary,
          networks,
          tables,
          viewModels,
          visualStyles,
        }

        // Use the pure function to create nodes
        createNodesCore(paramsObj, storeActions)
      },
      [UndoCommandType.CREATE_EDGES]: (params: any[]) => {
        // Redo edge creation
        const paramsObj: CreateEdgesParams = {
          networkId: params[0],
          edgeIds: params[1],
          sourceId: params[2],
          targetId: params[3],
          attributes: params[4],
        }

        // Build store actions object
        const storeActions: EdgeOperationStoreActions = {
          deleteEdgesFromNetwork,
          addEdge,
          deleteRows,
          editRows,
          deleteViewObjects,
          addEdgeView,
          updateNetworkSummary,
          networks,
          tables,
          viewModels,
          visualStyles,
        }

        // Use the pure function to create edges
        createEdgesCore(paramsObj, storeActions)
      },
      [UndoCommandType.MOVE_NODES]: (params: any[]) => {
        const networkId: IdType = params[0]
        const nodeId: IdType = params[1]
        const nodePositions: [number, number] = params[2]
        setNodePosition(networkId, nodeId, nodePositions)
      },
      [UndoCommandType.MOVE_EDGES]: (params: any[]) => {
        useNetworkStore
          .getState()
          .moveEdge(params[0], params[1], params[2], params[3])
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
      [UndoCommandType.SET_CONTINUOUS_MAPPING]: (params: any[]) => {
        setMapping(params[0], params[1], params[2])
      },
      [UndoCommandType.SWITCH_STYLE]: (params: any[]) => {
        switchStyleOrThrow(params[0], params[1])
      },
    }
    // Same latest-state discipline as undoLastEdit (REVIEW.md B4/B5)
    const latestActiveNetworkViewId =
      useUiStateStore.getState().ui.activeNetworkView
    const latestTargetNetworkId =
      latestActiveNetworkViewId === ''
        ? useWorkspaceStore.getState().workspace.currentNetworkId
        : latestActiveNetworkViewId
    const latestStacks = useUndoStore.getState().undoRedoStacks[
      latestTargetNetworkId
    ] ?? { undoStack: [], redoStack: [] }
    const latestUndoStack = latestStacks.undoStack
    const latestRedoStack = latestStacks.redoStack

    const lastEdit = latestRedoStack[latestRedoStack.length - 1]
    const nextRedoStack = latestRedoStack.slice(0, latestRedoStack.length - 1)
    if (lastEdit) {
      const undoCommand = commandMap[lastEdit.undoCommand]

      if (undoCommand === undefined) {
        logHistory.warn(
          `[useUndoStack] Discarding edit with unknown redo command: ${String(lastEdit.undoCommand)}`,
        )
        setRedoStack(latestTargetNetworkId, nextRedoStack)
        return
      }
      try {
        undoCommand(lastEdit.redoParams)
      } catch (e) {
        logHistory.warn('[useUndoStack] Redo command failed; discarding edit:', e)
        setRedoStack(latestTargetNetworkId, nextRedoStack)
        return
      }
      setRedoStack(latestTargetNetworkId, nextRedoStack)
      setUndoStack(latestTargetNetworkId, [...latestUndoStack, lastEdit])
    }
  }, [
    updateNetworkSummary,
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
    setColumnName,
    editRows,
    deleteColumn,
    deleteNodesFromNetwork,
    deleteEdgesFromNetwork,
    deleteRows,
    deleteViewObjects,
    addNode,
    addEdge,
    addNodeView,
    addEdgeView,
    networks,
    tables,
    viewModels,
    visualStyles,
    switchStyleOrThrow,
  ])

  // Clears both stacks for the target network (this was a no-op before —
  // REVIEW.md B6). deleteStack also removes the persisted row via the
  // store's removeSlice wiring.
  const clearStack = useCallback(() => {
    const latestActiveNetworkViewId =
      useUiStateStore.getState().ui.activeNetworkView
    const latestTargetNetworkId =
      latestActiveNetworkViewId === ''
        ? useWorkspaceStore.getState().workspace.currentNetworkId
        : latestActiveNetworkViewId
    useUndoStore.getState().deleteStack(latestTargetNetworkId)
  }, [])

  return { undoStack, postEdit, undoLastEdit, redoLastEdit, clearStack }
}
