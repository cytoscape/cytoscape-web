// src/app-api/core/layoutApi.ts
// Framework-agnostic Layout API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { LayoutAlgorithm } from '../../models/LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../models/LayoutModel/LayoutEngine'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { dispatchCyWebEvent } from '../event-bus/dispatchCyWebEvent'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

export interface LayoutAlgorithmInfo {
  engineName: string
  algorithmName: string
  displayName: string
  description: string
  type: string
}

export interface ApplyLayoutOptions {
  /** Name of the algorithm to run. Defaults to `LayoutStore.preferredLayout`. */
  algorithmName?: string
  /** Whether to fit the viewport after layout. Defaults to `true`. */
  fitAfterLayout?: boolean
}

export interface LayoutApi {
  applyLayout(
    networkId: IdType,
    options?: ApplyLayoutOptions,
  ): Promise<ApiResult>
  getAvailableLayouts(): ApiResult<LayoutAlgorithmInfo[]>
}

// ── Private helpers ──────────────────────────────────────────────────────────

const DEFAULT_UNDO_STACK_SIZE = 20

function corePostEdit(
  undoCommand: UndoCommandType,
  description: string,
  undoParams: any[],
  redoParams: any[],
): void {
  const uiState = useUiStateStore.getState()
  const workspaceState = useWorkspaceStore.getState()
  const activeNetworkViewId = uiState.ui.activeNetworkView
  const currentNetworkId = workspaceState.workspace.currentNetworkId
  const targetNetworkId =
    activeNetworkViewId === '' ? currentNetworkId : activeNetworkViewId

  const undoState = useUndoStore.getState()
  const stack = undoState.undoRedoStacks[targetNetworkId] ?? {
    undoStack: [],
    redoStack: [],
  }
  const newEdit = { undoCommand, description, undoParams, redoParams }
  const nextUndoStack = [...stack.undoStack, newEdit].slice(
    -DEFAULT_UNDO_STACK_SIZE,
  )
  undoState.setUndoStack(targetNetworkId, nextUndoStack)
  undoState.setRedoStack(targetNetworkId, [])
}

function findEngineAndAlgorithm(
  algorithmName?: string,
): { engine: LayoutEngine; algorithm: LayoutAlgorithm } | undefined {
  const { layoutEngines, preferredLayout } = useLayoutStore.getState()

  if (algorithmName !== undefined) {
    for (const engine of layoutEngines) {
      const algorithm = engine.algorithms[algorithmName]
      if (algorithm !== undefined) {
        return { engine, algorithm }
      }
    }
    return undefined
  }

  // No algorithmName → use preferredLayout
  const preferred = preferredLayout
  for (const engine of layoutEngines) {
    const algorithm = engine.algorithms[preferred.name]
    if (algorithm !== undefined) {
      return { engine, algorithm }
    }
  }
  return undefined
}

// ── Core implementation ──────────────────────────────────────────────────────

export const layoutApi: LayoutApi = {
  async applyLayout(networkId, options = {}): Promise<ApiResult> {
    try {
      const { algorithmName, fitAfterLayout = true } = options

      // 1. Validate networkId
      const network = useNetworkStore.getState().networks.get(networkId)
      if (network === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }

      // 2–3. Find engine and algorithm
      const found = findEngineAndAlgorithm(algorithmName)
      if (found === undefined) {
        return fail(
          ApiErrorCode.LayoutEngineNotFound,
          algorithmName !== undefined
            ? `No layout engine found for algorithm '${algorithmName}'`
            : 'No layout engine found for preferred layout',
        )
      }
      const { engine, algorithm } = found
      const resolvedAlgorithmName = algorithm.name

      // 4. Snapshot pre-layout positions (for undo)
      const prevPositions = new Map<IdType, [number, number]>()
      const viewModel = useViewModelStore.getState().getViewModel(networkId)
      if (viewModel !== undefined) {
        for (const [nodeId, nodeView] of Object.entries(
          viewModel.nodeViews ?? {},
        )) {
          prevPositions.set(nodeId as IdType, [nodeView.x, nodeView.y])
        }
      }

      // 5. Dispatch layout:started
      dispatchCyWebEvent('layout:started', {
        networkId,
        algorithm: resolvedAlgorithmName,
      })

      // 6. setIsRunning(true)
      useLayoutStore.getState().setIsRunning(true)

      // 7. Apply layout — callback-based; wrap in Promise
      return new Promise<ApiResult>((resolve) => {
        engine.apply(
          network.nodes,
          network.edges,
          (positionMap: Map<IdType, [number, number]>) => {
            try {
              // 8a. Update node positions
              useViewModelStore
                .getState()
                .updateNodePositions(networkId, positionMap)

              // 8b. Record undo
              corePostEdit(
                UndoCommandType.APPLY_LAYOUT,
                `Apply layout: ${resolvedAlgorithmName}`,
                [networkId, prevPositions],
                [networkId, positionMap],
              )

              // 8c. Fit if requested
              if (fitAfterLayout) {
                const fn = useRendererFunctionStore
                  .getState()
                  .getFunction('cyjs', 'fit', networkId)
                if (fn !== undefined) {
                  fn()
                } else {
                  console.warn(
                    `[layoutApi] Fit function not registered for network ${networkId}; layout succeeded without fit`,
                  )
                }
              }

              // 8d. setIsRunning(false)
              useLayoutStore.getState().setIsRunning(false)

              // 8e. Dispatch layout:completed
              dispatchCyWebEvent('layout:completed', {
                networkId,
                algorithm: resolvedAlgorithmName,
              })

              // 8f. Resolve
              resolve(ok())
            } catch (callbackError) {
              useLayoutStore.getState().setIsRunning(false)
              resolve(
                fail(
                  ApiErrorCode.OperationFailed,
                  `Layout callback error: ${String(callbackError)}`,
                ),
              )
            }
          },
          algorithm,
        )
      })
    } catch (e) {
      useLayoutStore.getState().setIsRunning(false)
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getAvailableLayouts(): ApiResult<LayoutAlgorithmInfo[]> {
    try {
      const { layoutEngines } = useLayoutStore.getState()
      const infos: LayoutAlgorithmInfo[] = []
      for (const engine of layoutEngines) {
        for (const [algorithmName, algorithm] of Object.entries(
          engine.algorithms,
        )) {
          infos.push({
            engineName: engine.name,
            algorithmName,
            displayName: algorithm.displayName,
            description: algorithm.description,
            type: algorithm.type,
          })
        }
      }
      return ok(infos)
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
