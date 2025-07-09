import { Box, IconButton, Tooltip } from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { LayoutAlgorithm, LayoutEngine } from '../../models/LayoutModel'
import { useLayoutStore } from '../../store/LayoutStore'
import { IdType } from '../../models/IdType'
import { useViewModelStore } from '../../store/ViewModelStore'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useUndoStack } from '../../task/UndoStack'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { useState, useEffect } from 'react'
import { useRendererFunctionStore } from '../../store/RendererFunctionStore'

interface ApplyLayoutButtonProps {
  targetNetworkId?: IdType
  rendererId: string
  disabled?: boolean
}
export const ApplyLayoutButton = ({
  targetNetworkId,
  disabled = false,
  rendererId,
}: ApplyLayoutButtonProps): JSX.Element => {
  const getRendererFunction = useRendererFunctionStore(
    (state) => state.getFunction,
  )

  const [layoutInfo, setLayoutInfo] = useState<string | undefined>(undefined)

  // Counter to trigger fit after layout is applied
  // This is necessary to ensure the fit happens after the layout is applied
  // and the DOM has been updated with the new positions.
  // The number itself is not important, just keeping track of changes.
  const [layoutCounter, setLayoutCounter] = useState<number>(0)

  const networks: Map<string, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  // Use given network id if provided,
  // otherwise use the current network as the target
  const networkId: IdType = targetNetworkId ?? currentNetworkId

  const network: Network | undefined = networks.get(networkId)

  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const networkView = getViewModel(networkId ?? '')
  const { postEdit } = useUndoStack()

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

  // Effect to handle fit after layout completion
  useEffect(() => {
    // If layoutCounter is 0, no layout has been applied yet, so no need to call fit
    if (layoutCounter > 0) {
      const fitFunction = getRendererFunction(rendererId, 'fit')
      if (fitFunction !== undefined) {
        // Use double requestAnimationFrame pattern to ensure DOM updates are complete.
        // This is a common pattern to ensure that the fit happens after the layout
        // has been applied and the DOM has been updated with the new positions.
        // The first requestAnimationFrame ensures that the layout changes are applied,
        // and the second one ensures that the DOM has been updated before the
        // fit function call.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fitFunction()
          })
        })
      } else {
        console.warn('Fit function not available for renderer:', rendererId)
      }
    }
  }, [layoutCounter, rendererId, getRendererFunction])

  const afterLayout = (positionMap: Map<IdType, [number, number]>): void => {
    const prevPositions = new Map<IdType, [number, number]>()

    Object.entries(networkView?.nodeViews ?? {}).forEach(
      ([nodeId, nodeView]) => {
        prevPositions.set(nodeId, [nodeView.x, nodeView.y])
      },
    )
    // Update node positions in the view model
    updateNodePositions(networkId, positionMap)

    // Trigger fit  AFTER layout is applied by incrementing counter
    setLayoutCounter((prev) => prev + 1)

    postEdit(
      UndoCommandType.APPLY_LAYOUT,
      `Apply ${layoutInfo} Layout`,
      [networkId, prevPositions],
      [networkId, positionMap],
    )
    setIsRunning(false)
  }

  const handleClick = (): void => {
    if (network !== undefined && engine !== undefined) {
      setIsRunning(true)
      setLayoutInfo(defaultLayout.displayName)
      engine.apply(network.nodes, network.edges, afterLayout, defaultLayout)
    } else {
      console.log('Fit function not available')
    }
  }

  const innerButton = (
    <IconButton
      onClick={handleClick}
      aria-label="apply-layout"
      size="small"
      disableFocusRipple={true}
    >
      <Refresh fontSize="inherit" />
    </IconButton>
  )

  const innerButtonDisabled = (
    <IconButton
      onClick={handleClick}
      aria-label="apply-layout"
      size="small"
      disableFocusRipple={true}
      disabled={disabled}
    >
      <Refresh fontSize="inherit" />
    </IconButton>
  )
  if (disabled) {
    return (
      <Tooltip title={'Layouts cannot be applied to the current network view'}>
        <Box>{innerButtonDisabled}</Box>
      </Tooltip>
    )
  } else {
    return (
      <Tooltip
        title={`Apply default layout - ${defaultLayout.displayName}`}
        placement="top"
        arrow
      >
        {innerButton}
      </Tooltip>
    )
  }
}
