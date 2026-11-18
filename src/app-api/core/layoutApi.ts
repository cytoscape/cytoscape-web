// src/app-api/core/layoutApi.ts
// Framework-agnostic Layout API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { logApi } from '../../debug'
import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import {
  ClaimLayout,
  runLayoutWhenIdle,
} from '../../data/hooks/stores/runLayoutWhenIdle'
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
  /**
   * The name to pass as `applyLayout`'s `algorithmName`. For an algorithm
   * registered by an app it is the qualified `<appId>::<id>`.
   */
  algorithmName: string
  displayName: string
  description: string
  type: string
  /** Set when the algorithm was registered by an app ('layout-algorithm'). */
  appId?: string
}

export interface ApplyLayoutOptions {
  /** Name of the algorithm to run. Defaults to `LayoutStore.preferredLayout`. */
  algorithmName?: string
  /** Whether to fit the viewport after layout. Defaults to `true`. */
  fitAfterLayout?: boolean
  /**
   * When another layout is running, wait for it to finish and then run,
   * instead of failing with `LAYOUT_ALREADY_RUNNING` (APP16). Defaults to
   * `false`. Waiting calls start one after another, and the promise
   * resolves once this call's own layout has run. A call that would fail
   * anyway (unknown network or algorithm) fails at once without waiting; a
   * network deleted while the call waits resolves to `NETWORK_NOT_FOUND`.
   * There is no timeout: the call waits as long as the running layout takes.
   */
  waitIfBusy?: boolean
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

/**
 * One attempt to start an `applyLayout` run.
 *
 * Returns undefined, having changed nothing, when another layout is running
 * (#982). Otherwise returns the promise of the call's result: a failure when
 * the network or the algorithm does not exist, else the layout's outcome.
 * The network and algorithm are checked before the running flag, so a call
 * that will fail anyway fails at once instead of waiting. Everything is read
 * at the attempt, not when `applyLayout` was called: with `waitIfBusy` the
 * attempt can come after another layout has changed the network.
 *
 * `claim` takes the slot: the store's `startLayout` for an immediate call,
 * which also refuses while layouts wait for their turn, or the queue's claim
 * on a waiting call's turn.
 */
function attemptLayout(
  networkId: IdType,
  algorithmName: string | undefined,
  fitAfterLayout: boolean,
  claim: ClaimLayout = (id) => useLayoutStore.getState().startLayout(id),
): Promise<ApiResult> | undefined {
  // Whether this attempt claimed the run: only then may a failure lower the
  // flag, which otherwise belongs to the layout that is running.
  let started = false
  try {
    // 1. Validate networkId
    const network = useNetworkStore.getState().networks.get(networkId)
    if (network === undefined) {
      return Promise.resolve(fail(AppCodes.NETWORK_NOT_FOUND, networkId))
    }

    // 2–3. Find engine and algorithm
    const found = findEngineAndAlgorithm(algorithmName)
    if (found === undefined) {
      return Promise.resolve(
        fail(
          AppCodes.LAYOUT_ENGINE_NOT_FOUND,
          algorithmName ?? 'preferred layout',
        ),
      )
    }
    const { engine, algorithm } = found
    const resolvedAlgorithmName = algorithm.name

    // 4. Claim the single layout run for this network (#982). While another
    // layout runs, start nothing: a second run would overwrite the first
    // one's positions and lower its running flag. The claim also points
    // the indicator at this network's view rather than the active one
    // (#979).
    if (!claim(networkId)) {
      return undefined
    }
    started = true

    // 5. Snapshot pre-layout positions (for undo), once the run is ours: a
    // call that waited (waitIfBusy) must restore the positions the layout
    // before it left, not the ones from when it was called.
    const prevPositions = new Map<IdType, [number, number]>()
    const viewModel = useViewModelStore.getState().getViewModel(networkId)
    if (viewModel !== undefined) {
      for (const [nodeId, nodeView] of Object.entries(
        viewModel.nodeViews ?? {},
      )) {
        prevPositions.set(nodeId as IdType, [nodeView.x, nodeView.y])
      }
    }

    // 6. Dispatch layout:started
    dispatchCyWebEvent('layout:started', {
      networkId,
      algorithm: resolvedAlgorithmName,
    })

    // 7. Apply layout — callback-based; wrap in Promise. The run settles
    // once: whatever the engine reports after its first completion or
    // failure is logged and ignored, and the flag is lowered once. A second
    // lowering (an engine that reports positions, then rejects) could
    // release the slot of the next layout, which may have claimed it since.
    let settled = false
    let released = false
    const release = (): void => {
      if (!released) {
        released = true
        useLayoutStore.getState().setIsRunning(false)
      }
    }
    const lateReport = (what: string, detail?: unknown): void => {
      logApi.error(
        `[layoutApi]: Layout '${resolvedAlgorithmName}' on network ${networkId} ${what} after it had finished; ignored`,
        ...(detail === undefined ? [] : [detail]),
      )
    }

    return new Promise<ApiResult>((resolve) => {
      try {
        const applyResult = engine.apply(
          network.nodes,
          network.edges,
          (positionMap: Map<IdType, [number, number]>) => {
            if (settled) {
              lateReport('reported positions')
              return
            }
            settled = true
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
              release()

              // 8e. Dispatch layout:completed
              dispatchCyWebEvent('layout:completed', {
                networkId,
                algorithm: resolvedAlgorithmName,
              })

              // 8f. Resolve
              resolve(ok())
            } catch (callbackError) {
              release()
              resolve(
                fail(
                  AppCodes.OPERATION_FAILED,
                  `Layout callback error: ${String(callbackError)}`,
                ),
              )
            }
          },
          algorithm,
          networkId,
        )

        // Async engines (lazily loaded) return a promise; a rejection there
        // never reaches the callback, so it would otherwise leave isRunning
        // stuck true and the returned promise pending forever.
        if (applyResult instanceof Promise) {
          applyResult.catch((err) => {
            if (settled) {
              lateReport('failed', err)
              return
            }
            settled = true
            release()
            resolve(
              fail(
                AppCodes.OPERATION_FAILED,
                `Layout engine failed to load: ${String(err)}`,
              ),
            )
          })
        }
      } catch (engineError) {
        // engine.apply threw synchronously — the promise executor's throw
        // would otherwise reject and cross the API boundary as an exception
        if (settled) {
          lateReport('threw', engineError)
          return
        }
        settled = true
        release()
        resolve(
          fail(
            AppCodes.OPERATION_FAILED,
            `Layout engine error: ${String(engineError)}`,
          ),
        )
      }
    })
  } catch (e) {
    if (started) {
      useLayoutStore.getState().setIsRunning(false)
    }
    return Promise.resolve(fail(AppCodes.OPERATION_FAILED, String(e)))
  }
}

// ── Core implementation ──────────────────────────────────────────────────────

export const layoutApi: LayoutApi = {
  async applyLayout(networkId, options = {}): Promise<ApiResult> {
    try {
      const {
        algorithmName,
        fitAfterLayout = true,
        waitIfBusy = false,
      } = options
      // Options reach window.CyWebApi from any caller: a truthy non-boolean
      // must not be read as a request to wait.
      if (typeof waitIfBusy !== 'boolean') {
        return fail(
          AppCodes.INVALID_INPUT,
          `waitIfBusy must be a boolean, got ${typeof waitIfBusy}`,
        )
      }

      const now = attemptLayout(networkId, algorithmName, fitAfterLayout)
      if (now !== undefined) {
        return await now
      }
      if (!waitIfBusy) {
        return fail(AppCodes.LAYOUT_ALREADY_RUNNING, networkId)
      }

      // Another layout is running, or others wait: start this one on its
      // turn, through the queue the host's automatic layouts use. Waiting
      // calls start one after another, first come first served. A network
      // deleted meanwhile resolves to NETWORK_NOT_FOUND at once, and the
      // attempt re-checks the network and algorithm on its turn.
      return await new Promise<ApiResult>((resolve) => {
        runLayoutWhenIdle(
          (claim) => {
            const run = attemptLayout(
              networkId,
              algorithmName,
              fitAfterLayout,
              claim,
            )
            if (run === undefined) {
              return false
            }
            void run.then(resolve)
            return true
          },
          {
            networkId,
            // Deleted while waiting: settle now rather than on the slot
            onNetworkRemoved: () =>
              resolve(fail(AppCodes.NETWORK_NOT_FOUND, networkId)),
          },
        )
      })
    } catch (e) {
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
            ...(engine.appId !== undefined ? { appId: engine.appId } : {}),
          })
        }
      }
      return ok({ layouts })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
}
