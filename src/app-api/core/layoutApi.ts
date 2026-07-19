// src/app-api/core/layoutApi.ts
// Framework-agnostic Layout API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { logApi } from '../../debug'
import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../models/IdType'
import { LayoutAlgorithm } from '../../models/LayoutModel/LayoutAlgorithm'
import { LayoutEngine } from '../../models/LayoutModel/LayoutEngine'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { dispatchCyWebEvent } from '../event-bus/dispatchCyWebEvent'
import { AppCodes, ApiResult, fail, ok } from '../types/ApiResult'
import { corePostEdit } from './undo'

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
  getAvailableLayouts(): ApiResult<{ layouts: LayoutAlgorithmInfo[] }>
}

// ── Private helpers ──────────────────────────────────────────────────────────

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
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }

      // 2–3. Find engine and algorithm
      const found = findEngineAndAlgorithm(algorithmName)
      if (found === undefined) {
        return fail(
          AppCodes.LAYOUT_ENGINE_NOT_FOUND,
          algorithmName ?? 'preferred layout',
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
        try {
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
                  networkId,
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
                    logApi.warn(
                      `Fit function not registered for network ${networkId}; layout succeeded without fit`,
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
                    AppCodes.OPERATION_FAILED,
                    `Layout callback error: ${String(callbackError)}`,
                  ),
                )
              }
            },
            algorithm,
          )
        } catch (engineError) {
          // engine.apply threw synchronously — the promise executor's throw
          // would otherwise reject and cross the API boundary as an exception
          useLayoutStore.getState().setIsRunning(false)
          resolve(
            fail(
              AppCodes.OPERATION_FAILED,
              `Layout engine error: ${String(engineError)}`,
            ),
          )
        }
      })
    } catch (e) {
      useLayoutStore.getState().setIsRunning(false)
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getAvailableLayouts(): ApiResult<{ layouts: LayoutAlgorithmInfo[] }> {
    try {
      const { layoutEngines } = useLayoutStore.getState()
      const layouts: LayoutAlgorithmInfo[] = []
      for (const engine of layoutEngines) {
        for (const [algorithmName, algorithm] of Object.entries(
          engine.algorithms,
        )) {
          layouts.push({
            engineName: engine.name,
            algorithmName,
            displayName: algorithm.displayName,
            description: algorithm.description,
            type: algorithm.type,
          })
        }
      }
      return ok({ layouts })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
}
