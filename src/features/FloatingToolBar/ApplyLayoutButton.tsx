import Refresh from '@mui/icons-material/Refresh'
import { Box, IconButton, Tooltip } from '@mui/material'
import { useEffect, useState } from 'react'

import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../data/hooks/useUndoStack'
import { logUi } from '../../debug'
import { IdType } from '../../models/IdType'
import { LayoutAlgorithm, LayoutEngine } from '../../models/LayoutModel'
import { Network } from '../../models/NetworkModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { runEngineLayout } from '../../models/LayoutModel/impl/runEngineLayout'

/** The button's icon; the manual draws the same one (UiIcon). */
export const ApplyLayoutIcon = Refresh

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
  const [layoutInfo, setLayoutInfo] = useState<string | undefined>(undefined)

  // The network whose layout just completed, to fit once the new positions
  // have been rendered. A fresh object per layout re-runs the effect.
  const [fitTarget, setFitTarget] = useState<{ networkId: IdType }>()

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

  const setIsRunning: (isRunning: boolean, networkId?: IdType) => void =
    useLayoutStore((state) => state.setIsRunning)

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

  /**
   * After a layout, fit the network that was laid out, in this toolbar's
   * renderer. The renderer-wide 'fit' slot holds whichever canvas registered
   * last, so it must not stand in for that network's own canvas (#964).
   */
  useEffect(
    function fitAfterLayout() {
      if (fitTarget === undefined) return
      const fitFunction = useRendererFunctionStore
        .getState()
        .getFunction(rendererId, 'fit', fitTarget.networkId)
      if (fitFunction !== undefined) {
        fitFunction()
      } else {
        logUi.warn(
          `[${ApplyLayoutButton.name}]:[${fitAfterLayout.name}]: Fit function not available for renderer ${rendererId}, network ${fitTarget.networkId}`,
        )
      }
    },
    [fitTarget, rendererId],
  )

  const afterLayout = (positionMap: Map<IdType, [number, number]>): void => {
    const prevPositions = new Map<IdType, [number, number]>()

    Object.entries(networkView?.nodeViews ?? {}).forEach(
      ([nodeId, nodeView]) => {
        prevPositions.set(nodeId, [nodeView.x, nodeView.y])
      },
    )
    // Update node positions in the view model
    updateNodePositions(networkId, positionMap)

    // Fit AFTER the new positions are rendered
    setFitTarget({ networkId })

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
      setLayoutInfo(defaultLayout.displayName)
      runEngineLayout({
        engine,
        algorithm: defaultLayout,
        network,
        networkId,
        afterLayout,
        setIsRunning,
      })
    } else {
      logUi.warn(
        `[${ApplyLayoutButton.name}]:[${handleClick.name}]: Engine or network not found`,
      )
    }
  }

  const innerButton = (
    <IconButton
      data-testid="apply-layout-button"
      onClick={handleClick}
      aria-label="apply-layout"
      size="small"
      disableFocusRipple={true}
    >
      <ApplyLayoutIcon fontSize="inherit" />
    </IconButton>
  )

  const innerButtonDisabled = (
    <IconButton
      data-testid="apply-layout-button"
      onClick={handleClick}
      aria-label="apply-layout"
      size="small"
      disableFocusRipple={true}
      disabled={disabled}
    >
      <ApplyLayoutIcon fontSize="inherit" />
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
