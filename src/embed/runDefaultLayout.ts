import { IdType } from '@/models/IdType'
import { Network } from '@/models/NetworkModel'

/**
 * Lay out a network that has no coordinates, with the engine and algorithm
 * the full app picks on import (useRegisterNetwork.ts). Resolves to
 * undefined when the network is over the layout threshold.
 *
 * The layout modules load on demand, so a network with coordinates never
 * downloads them.
 */
export const runDefaultLayout = async (
  networkId: IdType,
  network: Network,
  isHierarchical: boolean,
  maxNetworkElementsThreshold: number,
): Promise<Map<IdType, [number, number]> | undefined> => {
  const [{ getDefaultLayout, LayoutEngines }, { runEngineLayout }] =
    await Promise.all([
      import('@/models/LayoutModel/impl/layoutSelection'),
      import('@/models/LayoutModel/impl/runEngineLayout'),
    ])

  const choice = getDefaultLayout(
    network.nodes.length + network.edges.length,
    maxNetworkElementsThreshold,
    isHierarchical,
  )
  const engine = LayoutEngines.find((e) => e.name === choice?.engineName)
  if (choice === undefined || engine === undefined) {
    return undefined
  }

  return await new Promise((resolve, reject) => {
    runEngineLayout({
      engine,
      algorithm: engine.algorithms[choice.algorithmName],
      network,
      networkId,
      afterLayout: resolve,
      // runEngineLayout reports failure only by resetting the running flag
      // without calling afterLayout.
      setIsRunning: (isRunning) => {
        if (!isRunning) reject(new Error('Layout failed'))
      },
    })
  })
}
