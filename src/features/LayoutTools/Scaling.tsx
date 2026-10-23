import RefreshIcon from '@mui/icons-material/Refresh'
import { Box, IconButton, Stack, Theme, useTheme } from '@mui/material'
import Slider from '@mui/material/Slider'
import {
  MutableRefObject,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useUndoStack } from '../../data/hooks/useUndoStack'
import { IdType } from '../../models/IdType'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { NetworkView, NodeView } from '../../models/ViewModel'
import { ScalingType, ScalingTypeSelector } from './ScalingTypeSelector'
import {
  Anchor,
  calcScale,
  formatScale,
  getCenter,
  isPointerEvent,
  Position,
  ScaleFactors,
  scalePosition,
  SCALING_MARKS,
  snapToMark,
  unscalePosition,
} from './scalingUtil'

/** Per-axis factors for a scaling factor in the given mode */
const scaleFactors = (
  scalingType: ScalingType,
  scalingFactor: number,
): ScaleFactors => [
  scalingType === 'height' ? 1.0 : scalingFactor,
  scalingType === 'width' ? 1.0 : scalingFactor,
  scalingFactor,
]

/**
 * Pointer input snaps onto a mark it lands next to, so x1.0 really is 1.0;
 * the keyboard steps through every value.
 */
const sliderValueOf = (
  event: Event | SyntheticEvent,
  value: number | number[],
): number => {
  const valueAsNumber: number = typeof value === 'number' ? value : value[0]
  return isPointerEvent(event) ? snapToMark(valueAsNumber) : valueAsNumber
}

interface ScalingProps {
  networkId: IdType
}

export const Scaling = ({ networkId }: ScalingProps): JSX.Element => {
  const theme: Theme = useTheme()
  const { postEdit } = useUndoStack()

  // Check initialization state
  const initRef: MutableRefObject<boolean> = useRef<boolean>(true)

  // Scaling type. Default is both with and height
  const [scalingType, setScalingType] = useState<ScalingType>('both')

  // Slider position. Default position is center (0) = identity scaling
  const [sliderValue, setSliderValue] = useState<number>(0)

  // Original positions of the nodes. Assign empty map as default
  const [originalPositions, setOriginalPositions] = useState<
    Map<IdType, Position>
  >(new Map<IdType, Position>())

  // The point positions are scaled about: the center of the original
  // positions' bounding box, so the network stays where it is on screen.
  // It is held fixed while the slider is off x1.0, so that scaling and
  // unscaling a position always use the same point.
  const anchorRef: MutableRefObject<Anchor> = useRef<Anchor>([0, 0])

  // Notify other components that the manual layout is running
  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  // Update node positions in the network view model
  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  // Target network view
  const networkView: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(networkId),
  )

  // Nothing to scale: the network has no nodes, or its view is not loaded
  // yet. The controls are disabled rather than doing nothing on release.
  const hasNodes: boolean =
    networkView !== undefined && Object.keys(networkView.nodeViews).length > 0

  /**
   * Initialize the original positions when new network is detected
   */
  useEffect(() => {
    initRef.current = false
    // Current network is switched. Reset the slider to zero
    setSliderValue(0)
    setOriginalPositions(new Map<IdType, Position>())
    anchorRef.current = [0, 0]
  }, [networkId])

  /**
   * Set the original positions only once when the network view is initialized
   */
  useEffect(() => {
    // Make sure this is called only once when network is switched.
    // Otherwise, the original positions will be confused
    if (networkView !== undefined && initRef.current === false) {
      refreshPositions(networkView.nodeViews)
      initRef.current = true
    }
  }, [networkView])

  /**
   * Update the original positions when the node positions are changed
   * by external components after the initialization
   */
  useEffect(() => {
    if (initRef.current && networkView !== undefined) {
      const { nodeViews } = networkView
      // If external components change the node positions after initialization,
      // update the original positions used for scaling
      const factors = scaleFactors(scalingType, calcScale(sliderValue))
      Object.keys(nodeViews).forEach((nodeId) => {
        const nv = nodeViews[nodeId]
        const original = originalPositions.get(nodeId)
        // Where the slider put this node. Computed exactly as applyScaling
        // does, so a node the slider placed compares equal and keeps its
        // original position instead of accumulating rounding error.
        const expected =
          original === undefined
            ? undefined
            : scalePosition(original, anchorRef.current, factors)
        if (
          expected === undefined ||
          nv.x !== expected[0] ||
          nv.y !== expected[1] ||
          (nv.z ?? 0) !== expected[2]
        ) {
          // Moved by someone else: find the original position it now stands
          // for at the current scale
          originalPositions.set(
            nodeId,
            unscalePosition([nv.x, nv.y, nv.z], anchorRef.current, factors),
          )
        }
      })
      // At x1.0 the anchor can follow the layout without moving any node
      if (sliderValue === 0) {
        anchorRef.current = getCenter(originalPositions)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkView?.nodeViews])

  const handleChange = (event: Event, value: number | number[]): void => {
    setSliderValue(sliderValueOf(event, value))
  }

  const handleUpdate = (
    event: Event | SyntheticEvent,
    value: number | number[],
  ): void => {
    const valueAsNumber: number = sliderValueOf(event, value)
    setSliderValue(valueAsNumber)
    const scalingFactor = calcScale(valueAsNumber)
    applyScaling(scalingFactor)
  }

  const applyScaling = (scalingFactor: number): void => {
    // Nothing to scale: a network with no nodes, or the original positions
    // are not read yet. Return before raising the running flag, which
    // nothing else would clear (#880).
    const nodeIds: IdType[] = [...originalPositions.keys()]
    if (networkView === undefined || nodeIds.length === 0) {
      return
    }

    // Start the layout
    setIsRunning(true)

    // Scale relative to the original positions
    const positions = new Map<IdType, Position>()

    const factors = scaleFactors(scalingType, scalingFactor)
    const prevPositions = new Map<IdType, [number, number]>()

    Object.entries(networkView?.nodeViews ?? {}).forEach(
      ([nodeId, nodeView]) => {
        prevPositions.set(nodeId, [nodeView.x, nodeView.y])
      },
    )

    nodeIds.forEach((nodeId: IdType) => {
      const position = originalPositions.get(nodeId) ?? [0, 0, 0]
      positions.set(nodeId, scalePosition(position, anchorRef.current, factors))
    })
    postEdit(
      UndoCommandType.APPLY_LAYOUT,
      `Apply layout scale`,
      [networkId, prevPositions],
      [networkId, positions],
    )
    updateNodePositions(networkId, positions)

    // Finished
    setIsRunning(false)
  }

  const reset = (): void => {
    if (networkView === undefined) {
      return
    }
    // Copy current positions to the original positions
    refreshPositions(networkView.nodeViews)
    setSliderValue(0)
  }

  const refreshPositions = (nodeViews: Record<IdType, NodeView>): void => {
    const positions = new Map<IdType, Position>()
    const nodeIds: IdType[] = Object.keys(nodeViews)
    nodeIds.forEach((nodeId: IdType) => {
      const nv: NodeView = nodeViews[nodeId]
      positions.set(nodeId, [nv.x, nv.y, nv.z])
    })
    anchorRef.current = getCenter(positions)
    setOriginalPositions(positions)
  }

  const valuetext = (value: number): string => {
    return `x${calcScale(value)}`
  }

  const valueLabelFormat = (value: number): string => {
    return formatScale(calcScale(value))
  }

  return (
    <Box data-testid="scaling-component">
      <ScalingTypeSelector
        scalingType={scalingType}
        setScalingType={setScalingType}
        disabled={!hasNodes}
      />
      <Stack
        sx={{ paddingLeft: theme.spacing(2) }}
        direction="row"
        spacing={1}
        justifyContent="center"
        alignItems="center"
      >
        <Slider
          data-testid="scaling-slider"
          aria-label="Scaling marks"
          value={sliderValue}
          step={0.1}
          size="small"
          marks={SCALING_MARKS}
          valueLabelDisplay="auto"
          valueLabelFormat={valueLabelFormat}
          getAriaValueText={valuetext}
          min={-9}
          max={9}
          track={false}
          disabled={!hasNodes}
          onChangeCommitted={handleUpdate}
          onChange={handleChange}
        />
        <IconButton
          data-testid="scaling-reset-button"
          aria-label="refresh"
          size="large"
          sx={{ marginBottom: theme.spacing(4) }}
          disabled={!hasNodes}
          onClick={reset}
        >
          <RefreshIcon fontSize="large" />
        </IconButton>
      </Stack>
    </Box>
  )
}
