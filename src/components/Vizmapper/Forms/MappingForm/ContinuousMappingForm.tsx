import * as React from 'react'
import {
  Button,
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
} from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { scaleLinear } from 'd3-scale'
import { color } from 'd3-color'
import Draggable from 'react-draggable'

import { IdType } from '../../../../models/IdType'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { ContinuousMappingFunction } from '../../../../models/VisualStyleModel/VisualMappingFunction'
import { ContinuousFunctionInterval } from '../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'

import { VisualPropertyValueForm } from '../VisualPropertyValueForm'

// color mapping form for now
export function ContinuousMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const m: ContinuousMappingFunction | null = props.visualProperty
    ?.mapping as ContinuousMappingFunction

  if (m == null) {
    return <Box></Box>
  }

  // keep track of previous mapping
  const [previousMapping, setPreviousMapping] =
    React.useState<ContinuousMappingFunction | null>(null)

  React.useEffect(() => {
    setPreviousMapping(
      (props.visualProperty?.mapping as ContinuousMappingFunction) ?? null,
    )
  })

  const [intervals, setIntervals] = React.useState<
    ContinuousFunctionInterval[]
  >([
    {
      max: -2.426,
      maxVPValue: '#0066CC',
      includeMin: false,
      includeMax: true,
    },
    {
      min: -2.426,
      max: 1.225471493171426e-7,
      maxVPValue: '#FFFFFF',
      minVPValue: '#0066CC',
      includeMin: true,
      includeMax: true,
    },
    {
      min: 1.225471493171426e-7,
      max: 2.058,
      maxVPValue: '#FFFF00',
      minVPValue: '#FFFFFF',
      includeMin: true,
      includeMax: true,
    },
    {
      min: 2.058,
      minVPValue: '#FFFF00',
      includeMin: true,
      includeMax: false,
    },
  ])

  const mapper = scaleLinear(
    // domain
    [
      intervals[0].max as number,
      intervals[1].max as number,
      intervals[intervals.length - 1].min as number,
    ],
    // range
    [
      intervals[0].maxVPValue as string,
      intervals[1].maxVPValue as string,
      intervals[intervals.length - 1].minVPValue as string,
    ],
  )

  if (intervals.length < 2) {
    return <Box>Invalid number of intervals</Box>
  }

  const NUM_GRADIENT_STEPS = 100
  const GRADIENT_STEP_WIDTH = 4

  // map values in the continuous mapping range to a pixel position
  const rangePositionToPixelPosition = (rangePosition: number): number => {
    const rangeToPixel = scaleLinear(
      [
        intervals[0].max as number,
        intervals[intervals.length - 1].min as number,
      ],
      [0, NUM_GRADIENT_STEPS],
    )
    const value = rangeToPixel(rangePosition) ?? 0

    return value * GRADIENT_STEP_WIDTH
  }

  const pixelPositionToRangePosition = (pixelPosition: number): number => {
    const pixelToRange = scaleLinear(
      [0, NUM_GRADIENT_STEPS],
      [
        intervals[0].max as number,
        intervals[intervals.length - 1].min as number,
      ],
    )
    const value = pixelToRange(pixelPosition) ?? 0

    return value
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 10,
          justifyContent: 'space-between',
        }}
      >
        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 1,
            m: 1,
          }}
          elevation={2}
        >
          <VisualPropertyValueForm
            currentValue={intervals[0].maxVPValue ?? null}
            visualProperty={props.visualProperty}
            onValueChange={(newValue) => {
              setIntervals((prev) => {
                const newIntervals = [...prev]
                newIntervals[0].maxVPValue = newValue
                return newIntervals
              })
            }}
          />
          <Typography variant="body2">Min</Typography>
          <TextField
            sx={{ width: 50 }}
            inputProps={{
              sx: { p: 0.5, fontSize: 14, width: 50 },
              inputMode: 'numeric',
              pattern: '[0-9]*',
              step: 0.1,
            }}
            onChange={(e) => {
              setIntervals((prev) => {
                const newIntervals = [...prev]
                newIntervals[0].max = isNaN(Number(e.target.value))
                  ? 0
                  : Number(e.target.value)
                return newIntervals
              })
            }}
            value={intervals[0].max}
          />
        </Paper>
        <Paper sx={{ display: 'flex', position: 'relative' }}>
          {Array(NUM_GRADIENT_STEPS)
            .fill(0)
            .map((_, i) => {
              const value = pixelPositionToRangePosition(i)
              const nextColor = color(mapper(value))?.formatHex() ?? '#000000'

              return (
                <Box
                  key={i}
                  sx={{
                    width: GRADIENT_STEP_WIDTH,
                    height: 100,
                    backgroundColor: nextColor,
                  }}
                ></Box>
              )
            })}
          <Draggable
            bounds="parent"
            axis="x"
            handle=".handle"
            onDrag={(e, data) => {
              const newRangePosition = pixelPositionToRangePosition(
                data.x / GRADIENT_STEP_WIDTH,
              )

              setIntervals((prev) => {
                const newIntervals = [...prev]
                newIntervals[1].max = newRangePosition
                return newIntervals
              })
            }}
            defaultPosition={{
              x: rangePositionToPixelPosition(
                intervals[1].max != null ? (intervals[1].max as number) : 0,
              ),
              y: 0,
            }}
          >
            <Box
              sx={{
                width: 2,
                height: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                zIndex: 1,
              }}
            >
              <Paper
                sx={{
                  p: 1,
                  position: 'relative',
                  top: -100,
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <VisualPropertyValueForm
                  currentValue={intervals[1].maxVPValue ?? null}
                  visualProperty={props.visualProperty}
                  onValueChange={(newValue) => {
                    setIntervals((prev) => {
                      const newIntervals = [...prev]
                      newIntervals[1].maxVPValue = newValue
                      return newIntervals
                    })
                  }}
                />
                <TextField
                  sx={{ width: 50, mt: 1 }}
                  inputProps={{
                    sx: { p: 0.5, fontSize: 14, width: 50 },
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    step: 0.1,
                  }}
                  onChange={(e) => {
                    setIntervals((prev) => {
                      const newIntervals = [...prev]
                      newIntervals[1].max = isNaN(Number(e.target.value))
                        ? 0
                        : Number(e.target.value)
                      return newIntervals
                    })
                  }}
                  value={intervals[1].max as number}
                />
              </Paper>
              <IconButton
                className="handle"
                size="large"
                sx={{
                  position: 'relative',
                  top: -120,
                  '&:hover': { cursor: 'col-resize' },
                }}
              >
                <ArrowDropDownIcon sx={{ fontSize: '40px' }} />
              </IconButton>
            </Box>
          </Draggable>
        </Paper>
        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 1,
            m: 1,
          }}
          elevation={2}
        >
          <VisualPropertyValueForm
            currentValue={intervals[intervals.length - 1].minVPValue ?? null}
            visualProperty={props.visualProperty}
            onValueChange={(newValue) => {
              setIntervals((prev) => {
                const newIntervals = [...prev]
                newIntervals[newIntervals.length - 1].minVPValue = newValue
                return newIntervals
              })
            }}
          />
          <Typography variant="body2">Max</Typography>
          <TextField
            sx={{ width: 50 }}
            inputProps={{
              sx: { p: 0.5, fontSize: 14, width: 50 },
              inputMode: 'numeric',
              pattern: '[0-9]*',
              step: 0.1,
            }}
            onChange={(e) => {
              setIntervals((prev) => {
                const newIntervals = [...prev]
                newIntervals[newIntervals.length - 1].min = isNaN(
                  Number(e.target.value),
                )
                  ? 0
                  : Number(e.target.value)
                return newIntervals
              })
            }}
            value={intervals[intervals.length - 1].min}
          />
        </Paper>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Typography variant="body1">
          {props.visualProperty.mapping?.attribute}
        </Typography>
      </Box>
      <Button>Add Handle</Button>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button color="error" onClick={() => console.log(previousMapping)}>
          Cancel
        </Button>
        <Button>Confirm</Button>
      </Box>
      <Box>
        {intervals.map((i, index) => {
          return (
            <Box sx={{ p: 1 }} key={index}>
              {JSON.stringify(i, null, 2)}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
