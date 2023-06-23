import { Box, Theme, useTheme } from '@mui/material'
import Slider from '@mui/material/Slider'
import { useLayoutStore } from '../../store/LayoutStore'
import { IdType } from '../../models/IdType'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useEffect, useState } from 'react'
import { NetworkView, NodeView } from '../../models/ViewModel'

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

  const [disabled, setDisabled] = useState(true)

  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  const networkView: NetworkView | undefined = useViewModelStore(
    (state) => state.viewModels[networkId],
  )

  useEffect(() => {
    if (networkView !== undefined) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [networkView])

  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const handleChange = (event: Event, value: number | number[]): void => {
    const valueAsNumber: number = typeof value === 'number' ? value : value[0]
    let scaled: number = valueAsNumber
    if (valueAsNumber < 0) {
      scaled = (10 - Math.abs(valueAsNumber)) / 10
    } else {
      scaled = valueAsNumber + 1.0
    }
    console.log(scaled, valueAsNumber)
    applyScaling(scaled)
  }

  const applyScaling = (scalingFactor: number): void => {
    if (networkView === undefined) {
      return
    }

    // Start the layout
    setIsRunning(true)

    const positions = new Map<IdType, [number, number]>()
    const nodeIds: IdType[] = Object.keys(networkView.nodeViews)
    nodeIds.forEach((nodeId: IdType) => {
      const nv: NodeView = networkView.nodeViews[nodeId]
      positions.set(nv.id, [nv.x * scalingFactor, nv.y * scalingFactor])
    })
    updateNodePositions(networkId, positions)
    // Finished
    setIsRunning(false)
  }

  return (
    <Box sx={{ padding: theme.spacing(3) }}>
      <Slider
        disabled={disabled}
        aria-label="Scaling marks"
        defaultValue={0}
        step={0.1}
        size="small"
        marks={marks}
        min={-9}
        max={9}
        track={false}
        valueLabelDisplay="off"
        onChangeCommitted={handleChange}
      />
    </Box>
  )
}
