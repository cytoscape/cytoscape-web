import { LayoutAlgorithm } from '../../../models'
import { IdType } from '../../../models/IdType'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { Network } from '../../../models/NetworkModel'
import { runEngineLayout } from '../../../models/LayoutModel/impl/runEngineLayout'

export interface ApplyDefaultLayoutParams {
  layoutEngines: LayoutEngine[]
  preferredLayout: LayoutAlgorithm
  network: Network | undefined
  /** The network being laid out; app engines need it for the run context. */
  networkId: IdType
  afterLayout: (positionMap: Map<IdType, [number, number]>) => void
  /** The layout store's `startLayout`, which refuses while a layout runs. */
  startLayout: (networkId: IdType) => boolean
  setIsRunning: (isRunning: boolean) => void
}

/**
 * Runs the user's preferred (default) layout on the given network, mirroring the
 * behavior of the FloatingToolBar apply-layout button. The engine that owns the
 * preferred algorithm is resolved by name, falling back to the first available
 * engine. Returns false without doing anything when there is no usable network
 * or engine, so callers can guard the disabled/no-network case, and false
 * when another layout is already running (#982). A failing engine is
 * contained by runEngineLayout (logged, isRunning reset).
 */
export const applyDefaultLayout = ({
  layoutEngines,
  preferredLayout,
  network,
  networkId,
  afterLayout,
  startLayout,
  setIsRunning,
}: ApplyDefaultLayoutParams): boolean => {
  if (network === undefined || network.nodes === undefined) {
    return false
  }

  const engine: LayoutEngine | undefined =
    layoutEngines.find((e) => e.name === preferredLayout.engineName) ??
    layoutEngines[0]

  if (engine === undefined) {
    return false
  }

  return runEngineLayout({
    engine,
    algorithm: preferredLayout,
    network,
    networkId,
    afterLayout,
    startLayout,
    setIsRunning,
  })
}
