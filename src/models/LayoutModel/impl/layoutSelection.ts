import { LayoutAlgorithm } from '../LayoutAlgorithm'
import { LayoutEngine } from '../LayoutEngine'
import { CosmosLayout } from './Cosmos/cosmosLayout'
import { CyjsLayout } from './Cyjs/cyjsLayout'
import { G6Layout } from './G6/g6Layout'

export const LayoutEngines: LayoutEngine[] = [
  G6Layout,
  CyjsLayout,
  CosmosLayout,
]
export const defAlgorithm: LayoutAlgorithm = G6Layout.algorithms.gForce
export const defHierarchicalAlgorithm: LayoutAlgorithm =
  G6Layout.algorithms.dagre

export const getLayout = (
  engineName: string,
  algorithmName: string,
): LayoutAlgorithm | undefined => {
  const engine: LayoutEngine | undefined = LayoutEngines.find(
    (engine: { name: string }) => engine.name === engineName,
  )

  if (engine === undefined) {
    return
  }

  const algorithm: LayoutAlgorithm = engine.algorithms[algorithmName]

  if (algorithm === undefined) {
    return
  }

  return algorithm
}

export const ELE_THRESHOLD = 1000

/**
 * Pick the default layout for a network.
 *
 * @param numNetworkElements node + edge count
 * @param maxNetworkElementsThreshold above this, no layout is applied
 * @param isHierarchical whether the network is a hierarchy (HCX) — the
 *   caller decides (e.g. via `isHCX(summary)`); models must not import
 *   from features (REVIEW.md A7)
 */
export const getDefaultLayout = (
  numNetworkElements: number,
  maxNetworkElementsThreshold: number,
  isHierarchical: boolean,
): { engineName: string; algorithmName: string } | undefined => {
  // dont run a layout if the network is too large
  if (numNetworkElements > maxNetworkElementsThreshold) {
    return undefined
  }

  if (numNetworkElements < ELE_THRESHOLD) {
    if (isHierarchical) {
      return {
        engineName: G6Layout.name,
        algorithmName: G6Layout.algorithms.dagre.name,
      }
    } else {
      return {
        engineName: G6Layout.name,
        algorithmName: G6Layout.algorithms.gForce.name,
      }
    }
  }

  // only run grid if the network has more than ELE_THRESHOLD elements
  return {
    engineName: CyjsLayout.name,
    algorithmName: 'grid',
  }
}
