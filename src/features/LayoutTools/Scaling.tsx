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
  inferSliderState,
  isPointerEvent,
  Position,
  samePositions,
  scaleFactors,
  scalePosition,
  SCALING_MARKS,
  SLIDER_MAX,
  SLIDER_MIN,
  SLIDER_STEP,
  SliderState,
  snapToMark,
} from './scalingUtil'

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

  // Scaling type. Default is both with and height
  const [scalingType, setScalingType] = useState<ScalingType>('both')

  // Slider position. Default position is center (0) = identity scaling
  const [sliderValue, setSliderValue] = useState<number>(0)

  // Original positions of the nodes: where they stand at x1.0. A ref, not
  // state: nothing renders them, and the sync effect must see a rebase at
  // once rather than on the next render.
  const originalsRef: MutableRefObject<Map<IdType, Position>> = useRef<
    Map<IdType, Position>
  >(new Map<IdType, Position>())

  // The point positions are scaled about: the center of the original
  // positions' bounding box, so the network stays where it is on screen.
  // It is held fixed while the slider is off x1.0, so that scaling and
  // unscaling a position always use the same point.
  const anchorRef: MutableRefObject<Anchor> = useRef<Anchor>([0, 0])

  // The node views the sync effect last read. The store never mutates them,
  // so holding the record is enough to tell a move from a replacement that
  // moves nothing.
  const lastNodeViewsRef: MutableRefObject<
    Record<IdType, NodeView> | undefined
  > = useRef<Record<IdType, NodeView> | undefined>(undefined)

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
   * Forget the previous network's positions when the network is switched.
   * The sync effect below, declared after this one, then reads the new
   * network's positions as its x1.0.
   */
  useEffect(() => {
    setSliderValue(0)
    originalsRef.current = new Map<IdType, Position>()
    anchorRef.current = [0, 0]
    lastNodeViewsRef.current = undefined
  }, [networkId])

  /**
   * Keep the slider truthful whenever the node positions change (#896).
   *
   * Positions the slider explains (its own write, undo or redo of a scale,
   * another slider on this network) set the slider to the value and mode
   * that produced them. Any other change (a drag, a layout, new nodes, a
   * newly loaded view) makes the positions on screen the new x1.0. Nodes
   * never move here: only what the slider shows changes. A replacement of
   * the node views that moves no node is ignored.
   */
  useEffect(() => {
    if (networkView === undefined) {
      lastNodeViewsRef.current = undefined
      return
    }
    const { nodeViews } = networkView
    const previous = lastNodeViewsRef.current
    lastNodeViewsRef.current = nodeViews
    // Nothing moved: keep what the slider shows, including a mode the user
    // picked since the last scale
    if (previous !== undefined && samePositions(previous, nodeViews)) {
      return
    }
    const originals = originalsRef.current
    // Forget deleted nodes, so neither the anchor nor the next scale
    // counts them
    for (const nodeId of originals.keys()) {
      if (nodeViews[nodeId] === undefined) {
        originals.delete(nodeId)
      }
    }
    const current: SliderState = { scalingType, value: sliderValue }
    const inferred: SliderState | undefined = inferSliderState(
      nodeViews,
      originals,
      anchorRef.current,
      current,
    )
    if (inferred === undefined) {
      refreshPositions(nodeViews)
      setSliderValue(0)
      return
    }
    setSliderValue(inferred.value)
    setScalingType(inferred.scalingType)
    // At x1.0 the anchor can follow the layout without moving any node
    if (inferred.value === 0) {
      anchorRef.current = getCenter(originals)
    }
    // Only a change of positions can make the slider untruthful; a change
    // of the slider's own state is not one.
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
    const originalPositions = originalsRef.current
    const nodeIds: IdType[] = [...originalPositions.keys()]
    if (networkView === undefined || nodeIds.length === 0) {
      return
    }

    // Start the layout
    setIsRunning(true)

    // Scale relative to the original positions
    const positions = new Map<IdType, Position>()

    const factors = scaleFactors(scalingType, scalingFactor)
    // z included, so undo restores it along with x and y
    const prevPositions = new Map<IdType, Position>()

    Object.entries(networkView?.nodeViews ?? {}).forEach(
      ([nodeId, nodeView]) => {
        prevPositions.set(nodeId, [nodeView.x, nodeView.y, nodeView.z])
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
    originalsRef.current = positions
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
          step={SLIDER_STEP}
          size="small"
          marks={SCALING_MARKS}
          valueLabelDisplay="auto"
          valueLabelFormat={valueLabelFormat}
          getAriaValueText={valuetext}
          min={SLIDER_MIN}
          max={SLIDER_MAX}
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
