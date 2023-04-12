import { IconButton, Tooltip } from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { LayoutAlgorithm, LayoutEngine } from '../../models/LayoutModel'
import { useLayoutStore } from '../../store/LayoutStore'
import { IdType } from '../../models/IdType'
import { useViewModelStore } from '../../store/ViewModelStore'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'

export const ApplyLayoutButton = (): JSX.Element => {
  const networks: Map<string, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const network: Network | undefined = networks.get(currentNetworkId)

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
    updateNodePositions(currentNetworkId, positionMap)
    setIsRunning(false)
  }

  const handleClick = (): void => {
    if (network !== undefined && engine !== undefined) {
      setIsRunning(true)
      engine.apply(network.nodes, network.edges, afterLayout, defaultLayout)
    } else {
      console.log('Fit function not available')
    }
  }

  return (
    <Tooltip
      title={`Apply default layout (${defaultLayout.engineName} - ${defaultLayout.name})`}
      placement="top"
      arrow
    >
      <IconButton
        onClick={handleClick}
        aria-label="apply-layout"
        size="small"
        disableFocusRipple={true}
      >
        <Refresh fontSize="inherit" />
      </IconButton>
    </Tooltip>
  )
}
