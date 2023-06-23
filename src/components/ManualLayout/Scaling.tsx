import { Box, Theme, useTheme } from '@mui/material'
import Slider from '@mui/material/Slider'

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

export const Scaling = (): JSX.Element => {
  const theme: Theme = useTheme()

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

  const applyScaling = (scalingFactor: number): void => {}

  return (
    <Box sx={{ padding: theme.spacing(3) }}>
      <Slider
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
