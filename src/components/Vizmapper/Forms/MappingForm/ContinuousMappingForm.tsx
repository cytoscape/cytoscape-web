import * as React from 'react'
import {
  Button,
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
} from '@mui/material'
import _ from 'lodash'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import Delete from '@mui/icons-material/Close'
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
import { ValueType } from '../../../../models/TableModel'

interface Handle {
  id: number
  value: ValueType
  vpValue: VisualPropertyValueType
}

interface UiHandle extends Handle {
  pixelPosition: { x: number; y: number }
}

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
  }, [])

  const intervals = [
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
  ] as ContinuousFunctionInterval[]
  if (intervals.length < 2) {
    return <Box>Invalid number of intervals</Box>
  }

  const [min, setMin] = React.useState({
    value: intervals[0].max,
    vpValue: intervals[0].maxVPValue,
  })

  const [max, setMax] = React.useState({
    value: intervals[intervals.length - 1].min,
    vpValue: intervals[intervals.length - 1].minVPValue,
  })

  const NUM_GRADIENT_STEPS = 100
  const GRADIENT_STEP_WIDTH = 4

  // map values in the continuous mapping range to a pixel position
  const rangePositionToPixelPosition = (rangePosition: number): number => {
    const rangeToPixel = scaleLinear(
      [min.value as number, max.value as number],
      [0, NUM_GRADIENT_STEPS],
    )
    const value = rangeToPixel(rangePosition) ?? 0

    return value * GRADIENT_STEP_WIDTH
  }

  const pixelPositionToRangePosition = (pixelPosition: number): number => {
    const pixelToRange = scaleLinear(
      [0, NUM_GRADIENT_STEPS],
      [min.value as number, max.value as number],
    )
    const value = pixelToRange(pixelPosition) ?? 0

    return value
  }

  const rawHandles: Array<Pick<Handle, 'value' | 'vpValue'>> = []
  intervals.forEach((i) => {
    if (i.minVPValue != null && i.min != null) {
      rawHandles.push({
        value: i.min,
        vpValue: i.minVPValue,
      })
    }

    if (i.maxVPValue != null && i.max != null) {
      rawHandles.push({
        value: i.max,
        vpValue: i.maxVPValue,
      })
    }
  })

  const uniqueHandles = _.uniqWith(rawHandles, _.isEqual)

  const sortedHandles: UiHandle[] = Array.from(uniqueHandles)
    .sort((a, b) => (a.value as number) - (b.value as number))
    .map((h, index) => ({
      id: index,
      value: h.value,
      vpValue: h.vpValue,
      pixelPosition: {
        x: rangePositionToPixelPosition(h.value as number),
        y: 0,
      },
    }))

  const [handles, setHandles] = React.useState<UiHandle[]>(sortedHandles)

  const mapper = scaleLinear(
    // domain: handle values
    [
      min.value as number,
      ...handles.map((h) => h.value as number),
      max.value as number,
    ],
    // range: handle colors
    [
      min.vpValue as string,
      ...handles.map((h) => h.vpValue as string),
      max.vpValue as string,
    ],
  )

  React.useEffect(() => {
    // update the range values of each handle to be the same pixel position as they are now in the range
    const newHandles = handles.map((h) => {
      const newValue = pixelPositionToRangePosition(
        h.pixelPosition.x / GRADIENT_STEP_WIDTH,
      )

      return {
        ...h,
        value: newValue,
      }
    })

    setHandles(newHandles)
  }, [min.value, max.value])

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
            currentValue={min.vpValue ?? null}
            visualProperty={props.visualProperty}
            onValueChange={(newValue) => {
              setMin({
                value: min.value,
                vpValue: newValue,
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
              const newMin = Number(e.target.value)
              if (!isNaN(newMin)) {
                setMin({
                  value: newMin,
                  vpValue: min.vpValue,
                })
              }
            }}
            value={min.value}
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
          {handles.map((h) => {
            return (
              <Draggable
                key={h.id}
                bounds="parent"
                axis="x"
                handle=".handle"
                onDrag={(e, data) => {
                  const newRangePosition = pixelPositionToRangePosition(
                    data.x / GRADIENT_STEP_WIDTH,
                  )

                  const handleIndex = handles.findIndex(
                    (handle) => handle.id === h.id,
                  )
                  if (handleIndex >= 0) {
                    const newHandles = [...handles]
                    newHandles[handleIndex].value = newRangePosition
                    newHandles.sort(
                      (a, b) => (a.value as number) - (b.value as number),
                    )
                    setHandles(newHandles)
                  }
                }}
                defaultPosition={h.pixelPosition}
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
                    <IconButton
                      sx={{ position: 'absolute', top: -20, right: -16 }}
                      onClick={() => {
                        const handleIndex = handles.findIndex(
                          (handle) => handle.id === h.id,
                        )
                        if (handleIndex >= 0) {
                          const newHandles = [...handles]
                          newHandles.splice(handleIndex, 1)
                          setHandles(newHandles)
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>

                    <VisualPropertyValueForm
                      currentValue={h.vpValue ?? null}
                      visualProperty={props.visualProperty}
                      onValueChange={(newValue) => {
                        const handleIndex = handles.findIndex(
                          (handle) => handle.id === h.id,
                        )
                        if (handleIndex >= 0) {
                          const newHandles = [...handles]
                          newHandles[handleIndex].vpValue = newValue
                          setHandles(newHandles)
                        }
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
                        const handleIndex = handles.findIndex(
                          (handle) => handle.id === h.id,
                        )
                        if (handleIndex >= 0) {
                          const newHandles = [...handles]
                          const newVal = Number(e.target.value)

                          if (!isNaN(newVal)) {
                            newHandles[handleIndex].value = newVal
                          }
                          newHandles.sort(
                            (a, b) => (a.value as number) - (b.value as number),
                          )
                          setHandles(newHandles)
                        }
                      }}
                      value={h.value as number}
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
            )
          })}
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
            currentValue={max.vpValue ?? null}
            visualProperty={props.visualProperty}
            onValueChange={(newValue) => {
              setMax({
                value: max.value,
                vpValue: newValue,
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
              const newMax = Number(e.target.value)
              if (!isNaN(newMax)) {
                setMax({
                  value: newMax,
                  vpValue: max.vpValue,
                })
              }
            }}
            value={max.value}
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
    </Box>
  )
}
