import { LayoutAlgorithm } from '../../../models'
import { IdType } from '../../../models/IdType'
import { LayoutEngine } from '../../../models/LayoutModel/LayoutEngine'
import { Network } from '../../../models/NetworkModel'

export interface ApplyDefaultLayoutParams {
  layoutEngines: LayoutEngine[]
  preferredLayout: LayoutAlgorithm
  network: Network | undefined
  afterLayout: (positionMap: Map<IdType, [number, number]>) => void
  setIsRunning: (isRunning: boolean) => void
}

/**
 * Runs the user's preferred (default) layout on the given network, mirroring the
 * behavior of the FloatingToolBar apply-layout button. The engine that owns the
 * preferred algorithm is resolved by name, falling back to the first available
 * engine. Returns false without doing anything when there is no usable network
 * or engine, so callers can guard the disabled/no-network case.
 */
export const applyDefaultLayout = ({
  layoutEngines,
  preferredLayout,
  network,
  afterLayout,
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

  setIsRunning(true)
  engine.apply(network.nodes, network.edges, afterLayout, preferredLayout)
  return true
}
