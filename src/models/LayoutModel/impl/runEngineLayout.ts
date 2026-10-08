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
 */
export const runEngineLayout = ({
  engine,
  algorithm,
  network,
  networkId,
  afterLayout,
  setIsRunning,
}: RunEngineLayoutParams): void => {
  const onFailure = (error: unknown): void => {
    logUi.error(
      `[runEngineLayout]: Layout '${algorithm.displayName}' (${engine.name}) failed on network ${networkId}:`,
      error,
    )
    setIsRunning(false)
  }

  setIsRunning(true)
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
}
