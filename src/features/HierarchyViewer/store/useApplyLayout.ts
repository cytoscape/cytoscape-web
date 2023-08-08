import { IdType } from '../../../models/IdType'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'
import { useLayoutStore } from '../../../store/LayoutStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { Network } from '../../../models/NetworkModel'

export const useApplyLayout = (network: Network): void => {
  const { id } = network
  const defaultLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredLayout,
  )

  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  const engine: LayoutEngine =
    layoutEngines.find((engine) => engine.name === defaultLayout.engineName) ??
    layoutEngines[0]

  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const afterLayout = (positionMap: Map<IdType, [number, number]>): void => {
    updateNodePositions(id, positionMap)
    setIsRunning(false)
  }

  if (network !== undefined && engine !== undefined) {
    setIsRunning(true)
    engine.apply(network.nodes, network.edges, afterLayout, defaultLayout)
  } else {
    console.log('Fit function not available')
  }
}
