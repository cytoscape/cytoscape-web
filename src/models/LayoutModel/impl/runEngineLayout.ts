import { logUi } from '../../../debug'
import { IdType } from '../../IdType'
import { Network } from '../../NetworkModel'
import { LayoutAlgorithm } from '../LayoutAlgorithm'
import { LayoutEngine } from '../LayoutEngine'

export interface RunEngineLayoutParams {
  engine: LayoutEngine
  algorithm: LayoutAlgorithm
  network: Network
  /** The network being laid out; app engines need it for the run context. */
  networkId: IdType
  afterLayout: (positionMap: Map<IdType, [number, number]>) => void
  /**
   * The layout store's `startLayout`: claims the single layout run for
   * `networkId`, or returns false when a layout already runs (#982).
   */
  startLayout: (networkId: IdType) => boolean
  /**
   * The layout store's setter, used here only to lower the flag when the
   * engine fails. On success `afterLayout` owns lowering it.
   */
  setIsRunning: (isRunning: boolean) => void
}

/**
 * Run a layout engine from a host UI path (Layout menu, Settings dialog,
 * Apply Default Layout, floating toolbar) with the failure handling the
 * Layout API already has: a synchronous throw or a rejected promise from
 * `apply` is logged and resets `isRunning`, instead of leaving the running
 * flag stuck. `afterLayout` is only ever reached on success, so nothing
 * moves and no undo entry is recorded for a failed run.
 *
 * App engines always return a promise and reject on any failure; built-in
 * engines may be synchronous or (when lazily loaded) return a promise too.
 *
 * Only one layout runs at a time (#982). The run is claimed through
 * `startLayout` first; when another layout already runs, nothing starts, a
 * warning is logged and the function returns false. Two layouts on the same
 * network used to both run, the slower one overwriting the faster one's
 * positions, and the first to finish lowered the shared running flag while
 * the other still ran. Automatic layouts that must not be dropped wait for
 * their turn with `runLayoutWhenIdle` (`data/hooks/stores/`).
 *
 * @returns true when the layout started, false when it was refused
 */
export const runEngineLayout = ({
  engine,
  algorithm,
  network,
  networkId,
  afterLayout,
  startLayout,
  setIsRunning,
}: RunEngineLayoutParams): boolean => {
  if (!startLayout(networkId)) {
    logUi.warn(
      `[runEngineLayout]: Layout '${algorithm.displayName}' (${engine.name}) not started on network ${networkId}: another layout is running`,
    )
    return false
  }

  const onFailure = (error: unknown): void => {
    logUi.error(
      `[runEngineLayout]: Layout '${algorithm.displayName}' (${engine.name}) failed on network ${networkId}:`,
      error,
    )
    setIsRunning(false)
  }

  try {
    const result = engine.apply(
      network.nodes,
      network.edges,
      afterLayout,
      algorithm,
      networkId,
    )
    if (result instanceof Promise) {
      result.catch(onFailure)
    }
  } catch (error) {
    onFailure(error)
  }
  return true
}
