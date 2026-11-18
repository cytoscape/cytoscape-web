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
  /**
   * Applies the positions and lowers the flag. It must not start another
   * layout itself: if it then threw, the cleanup below would lower the flag
   * the new layout holds, since the flag carries no owner.
   */
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
  /**
   * Called once if the run fails (the engine throws or rejects, or
   * `afterLayout` throws), after the flag is lowered. For a caller that
   * waits on the run and must settle either way.
   */
  onFailed?: (error: unknown) => void
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
 * A run settles once: the first completion or failure counts and anything
 * the engine reports afterwards is logged and ignored. Lowering the flag a
 * second time (an engine that reports positions, then rejects) could release
 * the slot of the next layout, which may have claimed it in between. If
 * `afterLayout` itself throws, the flag is lowered right then, in the same
 * call, before any other layout can have started.
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
  onFailed,
}: RunEngineLayoutParams): boolean => {
  if (!startLayout(networkId)) {
    logUi.warn(
      `[runEngineLayout]: Layout '${algorithm.displayName}' (${engine.name}) not started on network ${networkId}: another layout is running`,
    )
    return false
  }

  const label = `Layout '${algorithm.displayName}' (${engine.name}) on network ${networkId}`
  let settled = false

  const onFailure = (error: unknown): void => {
    if (settled) {
      logUi.error(
        `[runEngineLayout]: ${label} failed after it had finished; ignored:`,
        error,
      )
      return
    }
    settled = true
    logUi.error(`[runEngineLayout]: ${label} failed:`, error)
    setIsRunning(false)
    onFailed?.(error)
  }

  const onComplete = (positionMap: Map<IdType, [number, number]>): void => {
    if (settled) {
      logUi.warn(
        `[runEngineLayout]: ${label} reported positions after it had finished; ignored`,
      )
      return
    }
    settled = true
    try {
      afterLayout(positionMap)
    } catch (error) {
      // It may have thrown before lowering the flag. Nothing else can have
      // started within this call, so lowering it now releases only this run.
      logUi.error(`[runEngineLayout]: ${label}: afterLayout failed:`, error)
      setIsRunning(false)
      onFailed?.(error)
    }
  }

  try {
    const result = engine.apply(
      network.nodes,
      network.edges,
      onComplete,
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
