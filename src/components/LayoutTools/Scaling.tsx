import { Box, IconButton, Stack, Theme, useTheme } from '@mui/material'
import Slider from '@mui/material/Slider'
import { useLayoutStore } from '../../store/LayoutStore'
import { IdType } from '../../models/IdType'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useEffect, useState } from 'react'
import { NetworkView, NodeView } from '../../models/ViewModel'
import RefreshIcon from '@mui/icons-material/Refresh'
import { ScalingType, ScalingTypeSelector } from './ScalingTypeSelector'

const marks = [
  {
    value: -9,
    label: 'x0.1',
  },
  {
    value: -4,
    label: 'x0.5',
  },
  {
    value: 0,
    label: 'x1.0',
  },
  {
    value: 4,
    label: 'x5',
  },
  {
    value: 9,
    label: 'x10',
  },
]

interface ScalingProps {
  networkId: IdType
}

export const Scaling = ({ networkId }: ScalingProps): JSX.Element => {
  const theme: Theme = useTheme()

  // Scaling type. Default is both with and height
  const [scalingType, setScalingType] = useState<ScalingType>('both')

  // Slider position. Default position is center (0)
  const [value, setValue] = useState<number>(0)

  // Original positions of the nodes. Assign empty map as default
  const [originalPositions, setOriginalPositions] = useState<
    Map<IdType, [number, number, number?]>
  >(new Map<IdType, [number, number, number?]>())

  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  const networkView: NetworkView | undefined = useViewModelStore(
    (state) => state.getViewModel(networkId),
  )

  useEffect(() => {
    // Switched. Reset the slider
    setValue(0)
    setOriginalPositions(new Map<IdType, [number, number, number?]>())
  }, [networkId])

  useEffect(() => {
    if (originalPositions.size === 0 && networkView !== undefined) {
      const positions = new Map<IdType, [number, number, number?]>()
      // Need to record the original position
      const nodeIds: IdType[] = Object.keys(networkView.nodeViews)
      nodeIds.forEach((nodeId: IdType) => {
        const nv: NodeView = networkView.nodeViews[nodeId]
        positions.set(nv.id, [nv.x, nv.y, nv.z])
      })
      setOriginalPositions(positions)
    }
  }, [networkView])

  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const handleChange = (event: Event, value: number | number[]): void => {
    setValue(value as number)
  }

  const calcScale = (value: number): number => {
    let scale = 1.0
    if (value < 0) {
      scale = (10 - Math.abs(value)) / 10
    } else {
      scale = value + 1.0
    }

    return scale
  }
  const handleUpdate = (event: Event, value: number | number[]): void => {
    const valueAsNumber: number = typeof value === 'number' ? value : value[0]
    setValue(valueAsNumber)
    applyScaling(calcScale(valueAsNumber))
  }

  const applyScaling = (scalingFactor: number): void => {
    if (networkView === undefined || originalPositions === undefined) {
      return
    }

    // Start the layout
    setIsRunning(true)

    // Scale relative to the original positions
    const positions = new Map<IdType, [number, number, number?]>()
    const nodeIds: IdType[] =
      originalPositions === undefined
        ? []
        : ([...originalPositions?.keys()] as IdType[])
    if (nodeIds.length === 0) {
      return
    }

    const scaleX: number = scalingType === 'height' ? 1.0 : scalingFactor
    const scaleY: number = scalingType === 'width' ? 1.0 : scalingFactor

    nodeIds.forEach((nodeId: IdType) => {
      const position = originalPositions.get(nodeId) ?? [0, 0, 0]
      positions.set(nodeId, [
        position[0] * scaleX,
        position[1] * scaleY,
        position[2] ?? 0 * scalingFactor,
      ])
    })
    updateNodePositions(networkId, positions)

    // Finished
    setIsRunning(false)
  }

  const reset = (): void => {
    if (networkView === undefined) {
      return
    }
    // Copy current positions to the original positions
    const positions = new Map<IdType, [number, number, number?]>()
    const { nodeViews } = networkView
    const nodeIds: IdType[] = Object.keys(nodeViews)
    nodeIds.forEach((nodeId: IdType) => {
      const nv: NodeView = nodeViews[nodeId]
      positions.set(nodeId, [nv.x, nv.y, nv.z])
    })
    setOriginalPositions(positions)
    setValue(0)
  }

  const valuetext = (value: number): string => {
    return `x${calcScale(value)}}`
  }

  const valueLabelFormat = (value: number): string => {
    return `x${calcScale(value).toFixed(1)}`
  }

  return (
    <Box>
      <ScalingTypeSelector
        scalingType={scalingType}
        setScalingType={setScalingType}
      />
      <Stack
        sx={{ paddingLeft: theme.spacing(2) }}
        direction="row"
        spacing={1}
        justifyContent="center"
        alignItems="center"
      >
        <Slider
          aria-label="Scaling marks"
          value={value}
          step={0.1}
          size="small"
          marks={marks}
          valueLabelDisplay="auto"
          valueLabelFormat={valueLabelFormat}
          getAriaValueText={valuetext}
          min={-9}
          max={9}
          track={false}
          onChangeCommitted={handleUpdate}
          onChange={handleChange}
        />
        <IconButton
          aria-label="refresh"
          size="large"
          sx={{ paddingBottom: theme.spacing(4) }}
          onClick={reset}
        >
          <RefreshIcon fontSize="large" />
        </IconButton>
      </Stack>
    </Box>
  )
}
